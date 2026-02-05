const express = require("express");
const router = express.Router();

const dbRaw = require("../db");
const pool = dbRaw?.execute ? dbRaw : dbRaw?.pool || dbRaw;

const asyncHandler = require("../utils/asyncHandler");
const { registrarBitacora, getIp } = require("../utils/bitacora");

const authRaw = require("../middleware/auth");
const rolesRaw = require("../middleware/roles");

const requireAuth =
  (typeof authRaw === "function" ? authRaw : (authRaw?.requireAuth || authRaw?.auth)) ||
  ((req, res, next) => (req.user ? next() : res.status(401).json({ ok: false, message: "No autenticado." })));

const allowRolesRaw =
  (typeof rolesRaw === "function" ? rolesRaw : (rolesRaw?.allowRoles || rolesRaw?.permitirRoles || rolesRaw?.roles));

const allowRoles =
  allowRolesRaw ||
  ((...roles) => (req, res, next) => {
    const r = (req.user?.rol || "").toLowerCase();
    if (roles.map(x => x.toLowerCase()).includes(r)) return next();
    return res.status(403).json({ ok: false, message: "No autorizado." });
  });

const execPool = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

const isInt = (v) => Number.isInteger(Number(v));
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const ESTADOS = ["NUEVA", "EN_PREPARACION", "LISTA", "ENTREGADA", "ANULADA"];
const TIPOS = ["MESA", "LLEVAR", "DELIVERY"];

// Transiciones estándar POS/KDS
const TRANSICIONES = {
  NUEVA: ["EN_PREPARACION", "ANULADA"],
  EN_PREPARACION: ["LISTA", "ANULADA"],
  LISTA: ["ENTREGADA", "ANULADA"],
  ENTREGADA: [],
  ANULADA: [],
};

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

async function emitBadges(req) {
  const io = getIO(req);
  if (!io) return;

  const [[a]] = await execPool(
    `SELECT COUNT(*) AS ordenes_hoy
     FROM ordenes
     WHERE fecha = CURDATE() AND estado <> 'ANULADA'`
  );

  const [[b]] = await execPool(
    `SELECT COUNT(*) AS en_cocina
     FROM ordenes
     WHERE fecha = CURDATE() AND estado = 'EN_PREPARACION'`
  );

  io.emit("badge:update", {
    ordenes: Number(a?.ordenes_hoy || 0),
    cocina: Number(b?.en_cocina || 0),
  });
}

function padCodigo(n) {
  // estilo dashboard: 023, 024...
  const num = Number(n);
  if (num < 1000) return String(num).padStart(3, "0");
  return String(num);
}

async function getCajaActiva(userId) {
  const [rows] = await execPool(
    `SELECT id FROM caja_sesiones
     WHERE usuario_id = ? AND estado = 'ABIERTA'
     ORDER BY id DESC LIMIT 1`,
    [Number(userId)]
  );
  return rows[0]?.id || null;
}

async function validarYPrepararItems(conn, items) {
  // Validaciones base
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("La orden debe incluir items.");
    err.status = 400;
    throw err;
  }

  // Normaliza
  const normalized = items.map((it) => ({
    producto_id: Number(it.producto_id),
    cantidad: Math.max(1, parseInt(it.cantidad || 1, 10)),
    notas: it.notas ? String(it.notas).trim().slice(0, 255) : null,
    opciones: Array.isArray(it.opciones) ? it.opciones : [],
  }));

  // Productos (bulk)
  const prodIds = [...new Set(normalized.map((x) => x.producto_id).filter((x) => Number.isInteger(x) && x > 0))];
  if (!prodIds.length) {
    const err = new Error("Items inválidos: producto_id.");
    err.status = 400;
    throw err;
  }

  const [prods] = await conn.execute(
    `SELECT id, nombre, precio, activo, en_menu
     FROM productos
     WHERE id IN (${prodIds.map(() => "?").join(",")})`,
    prodIds
  );

  const mapProd = new Map(prods.map((p) => [Number(p.id), p]));

  // Opciones (bulk)
  const opcionIds = [];
  for (const it of normalized) {
    for (const op of it.opciones) {
      if (op?.opcion_id) opcionIds.push(Number(op.opcion_id));
    }
  }
  const uniqueOpcionIds = [...new Set(opcionIds.filter((x) => Number.isInteger(x) && x > 0))];

  let opcionesDB = [];
  if (uniqueOpcionIds.length) {
    const [ops] = await conn.execute(
      `SELECT id, modificador_id, nombre, precio_extra, activo
       FROM modificador_opciones
       WHERE id IN (${uniqueOpcionIds.map(() => "?").join(",")})`,
      uniqueOpcionIds
    );
    opcionesDB = ops;
  }
  const mapOpcion = new Map(opcionesDB.map((o) => [Number(o.id), o]));

  // Validar relación producto_modificadores por cada producto (bulk por producto)
  const modByProd = new Map();
  const [pm] = await conn.execute(
    `SELECT producto_id, modificador_id
     FROM producto_modificadores
     WHERE producto_id IN (${prodIds.map(() => "?").join(",")})`,
    prodIds
  );
  for (const row of pm) {
    const pid = Number(row.producto_id);
    const mid = Number(row.modificador_id);
    if (!modByProd.has(pid)) modByProd.set(pid, new Set());
    modByProd.get(pid).add(mid);
  }

  // Construir items listos (con precio y nombres)
  const result = [];
  let subtotal = 0;

  for (const it of normalized) {
    const p = mapProd.get(it.producto_id);
    if (!p) {
      const err = new Error(`Producto no existe: ${it.producto_id}`);
      err.status = 400;
      throw err;
    }
    if (Number(p.activo) !== 1) {
      const err = new Error(`Producto inactivo: ${p.nombre}`);
      err.status = 409;
      throw err;
    }

    const basePrecio = toNum(p.precio, 0);
    const allowedMods = modByProd.get(it.producto_id) || new Set();

    const opcionesGuardables = [];
    let extras = 0;

    for (const op of it.opciones) {
      const modificador_id = Number(op.modificador_id);
      const opcion_id = Number(op.opcion_id);

      if (!Number.isInteger(modificador_id) || modificador_id <= 0) continue;
      if (!Number.isInteger(opcion_id) || opcion_id <= 0) continue;

      // valida que el modificador está asignado al producto
      if (!allowedMods.has(modificador_id)) {
        const err = new Error(`Modificador ${modificador_id} no permitido para producto ${p.nombre}`);
        err.status = 409;
        throw err;
      }

      const opc = mapOpcion.get(opcion_id);
      if (!opc) {
        const err = new Error(`Opción no existe: ${opcion_id}`);
        err.status = 400;
        throw err;
      }
      if (Number(opc.activo) !== 1) {
        const err = new Error(`Opción inactiva: ${opc.nombre}`);
        err.status = 409;
        throw err;
      }
      if (Number(opc.modificador_id) !== modificador_id) {
        const err = new Error(`Opción ${opcion_id} no pertenece a modificador ${modificador_id}`);
        err.status = 409;
        throw err;
      }

      const precio_extra = toNum(opc.precio_extra, 0);
      extras += precio_extra;

      opcionesGuardables.push({
        modificador_id,
        opcion_id,
        opcion_nombre: String(opc.nombre),
        precio_extra,
      });
    }

    const total_linea = (basePrecio + extras) * it.cantidad;
    subtotal += total_linea;

    result.push({
      producto_id: it.producto_id,
      producto_nombre: String(p.nombre),
      precio_unitario: basePrecio,
      cantidad: it.cantidad,
      notas: it.notas,
      total_linea,
      opciones: opcionesGuardables,
    });
  }

  return { items: result, subtotal };
}

/* =========================================================
   GET /api/ordenes/stats/hoy
   Dashboard rápido
========================================================= */
router.get(
  "/stats/hoy",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [[a]] = await execPool(
      `SELECT COUNT(*) AS ordenes_hoy
       FROM ordenes
       WHERE fecha = CURDATE() AND estado <> 'ANULADA'`
    );

    const [[b]] = await execPool(
      `SELECT COUNT(*) AS en_cocina
       FROM ordenes
       WHERE fecha = CURDATE() AND estado = 'EN_PREPARACION'`
    );

    res.json({
      ok: true,
      data: {
        ordenes_hoy: Number(a?.ordenes_hoy || 0),
        en_cocina: Number(b?.en_cocina || 0),
      },
    });
  })
);

/* =========================================================
   GET /api/ordenes/ultimas?limit=10
========================================================= */
router.get(
  "/ultimas",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const [rows] = await execPool(
      `SELECT id, codigo, tipo, mesa, estado, total, created_at
       FROM ordenes
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/ordenes
   filtros: estado, tipo, desde, hasta, q (codigo/cliente), hoy=1
========================================================= */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { estado, tipo, desde, hasta, q, hoy } = req.query;

    const where = [];
    const params = [];

    if (hoy === "1") {
      where.push("o.fecha = CURDATE()");
    } else {
      if (desde) {
        where.push("o.fecha >= ?");
        params.push(String(desde));
      }
      if (hasta) {
        where.push("o.fecha <= ?");
        params.push(String(hasta));
      }
    }

    if (estado && ESTADOS.includes(String(estado).toUpperCase())) {
      where.push("o.estado = ?");
      params.push(String(estado).toUpperCase());
    }

    if (tipo && TIPOS.includes(String(tipo).toUpperCase())) {
      where.push("o.tipo = ?");
      params.push(String(tipo).toUpperCase());
    }

    if (q) {
      where.push("(o.codigo LIKE ? OR o.cliente_nombre LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const sql = `
      SELECT
        o.id, o.fecha, o.numero_dia, o.codigo,
        o.cliente_nombre, o.tipo, o.mesa, o.estado,
        o.subtotal, o.descuento, o.impuesto, o.total,
        o.created_at, o.updated_at,
        u.nombre AS creado_por_nombre,
        (SELECT COUNT(*) FROM orden_detalle d WHERE d.orden_id = o.id) AS items_count
      FROM ordenes o
      LEFT JOIN usuarios u ON u.id = o.creado_por
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY o.id DESC
      LIMIT 300
    `;

    const [rows] = await execPool(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/ordenes/:id (detalle completo)
========================================================= */
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [oRows] = await execPool(
      `SELECT o.*, u.nombre AS creado_por_nombre
       FROM ordenes o
       LEFT JOIN usuarios u ON u.id = o.creado_por
       WHERE o.id = ?`,
      [Number(id)]
    );
    if (!oRows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });

    const orden = oRows[0];

    const [dRows] = await execPool(
      `SELECT id, orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, created_at
       FROM orden_detalle
       WHERE orden_id = ?
       ORDER BY id ASC`,
      [Number(id)]
    );

    const detIds = dRows.map((d) => d.id);
    let opsRows = [];
    if (detIds.length) {
      const [ops] = await execPool(
        `SELECT id, orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra
         FROM orden_detalle_opciones
         WHERE orden_detalle_id IN (${detIds.map(() => "?").join(",")})
         ORDER BY orden_detalle_id ASC, id ASC`,
        detIds
      );
      opsRows = ops;
    }

    const detalle = dRows.map((d) => ({
      ...d,
      opciones: opsRows.filter((o) => Number(o.orden_detalle_id) === Number(d.id)),
    }));

    const [hRows] = await execPool(
      `SELECT h.id, h.estado, h.cambiado_por, u.nombre AS cambiado_por_nombre, h.comentario, h.created_at
       FROM orden_estados_historial h
       LEFT JOIN usuarios u ON u.id = h.cambiado_por
       WHERE h.orden_id = ?
       ORDER BY h.id ASC`,
      [Number(id)]
    );

    res.json({ ok: true, data: { orden, detalle, historial: hRows } });
  })
);

/* =========================================================
   POST /api/ordenes (CREAR)
   Roles: admin, supervisor, cajero
   body:
   {
     tipo, mesa?, cliente_nombre?, notas?, descuento?,
     items: [{ producto_id, cantidad, notas?, opciones:[{modificador_id, opcion_id}] }]
   }
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const rol = (req.user?.rol || "").toLowerCase();

    const {
      tipo = "LLEVAR",
      mesa = null,
      cliente_nombre = null,
      notas = null,
      descuento = 0,
      items = [],
    } = req.body || {};

    const tipoUpper = String(tipo).toUpperCase();
    if (!TIPOS.includes(tipoUpper)) {
      return res.status(400).json({ ok: false, message: "Tipo inválido (MESA/LLEVAR/DELIVERY)." });
    }

    // regla POS típica: si es cajero, exige caja abierta para crear órdenes
    if (rol === "cajero") {
      const cajaId = await getCajaActiva(userId);
      if (!cajaId) {
        return res.status(409).json({
          ok: false,
          code: "CAJA_CERRADA",
          message: "No hay caja abierta. Abre caja para crear órdenes.",
        });
      }
    }

    const desc = Math.max(0, toNum(descuento, 0));

    // Transacción
    if (!pool.getConnection) {
      // fallback sin transacción (no recomendado), pero funcional:
      return res.status(500).json({ ok: false, message: "Pool sin soporte de transacciones (getConnection)." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // fecha hoy desde MySQL para evitar desfaces
      const [[hoyRow]] = await conn.execute(`SELECT CURDATE() AS hoy`);
      const fecha = hoyRow.hoy; // YYYY-MM-DD

      // correlativo diario con lock
      const [corr] = await conn.execute(
        `SELECT ultimo_numero FROM orden_correlativo WHERE fecha = ? FOR UPDATE`,
        [fecha]
      );

      let ultimo = 0;
      if (!corr.length) {
        await conn.execute(
          `INSERT INTO orden_correlativo (fecha, ultimo_numero) VALUES (?, 0)`,
          [fecha]
        );
        ultimo = 0;
      } else {
        ultimo = Number(corr[0].ultimo_numero || 0);
      }

      const numero_dia = ultimo + 1;
      const codigo = padCodigo(numero_dia);

      await conn.execute(
        `UPDATE orden_correlativo SET ultimo_numero = ? WHERE fecha = ?`,
        [numero_dia, fecha]
      );

      // validar items contra BD y preparar totales
      const { items: itemsOK, subtotal } = await validarYPrepararItems(conn, items);

      const impuesto = 0; // listo para integrar luego si agregas lógica fiscal
      const total = Math.max(0, subtotal - desc + impuesto);

      const cliente = cliente_nombre ? String(cliente_nombre).trim().slice(0, 120) : null;
      const notasOrden = notas ? String(notas).trim().slice(0, 255) : null;
      const mesaVal = tipoUpper === "MESA" ? (mesa ? String(mesa).trim().slice(0, 20) : null) : null;

      const [rOrden] = await conn.execute(
        `INSERT INTO ordenes
         (fecha, numero_dia, codigo, cliente_nombre, tipo, mesa, estado, notas, creado_por, subtotal, descuento, impuesto, total)
         VALUES (?, ?, ?, ?, ?, ?, 'NUEVA', ?, ?, ?, ?, ?, ?)`,
        [fecha, numero_dia, codigo, cliente, tipoUpper, mesaVal, notasOrden, userId, subtotal, desc, impuesto, total]
      );

      const ordenId = rOrden.insertId;

      // detalle + opciones
      for (const it of itemsOK) {
        const [rDet] = await conn.execute(
          `INSERT INTO orden_detalle
           (orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ordenId, it.producto_id, it.producto_nombre, it.precio_unitario, it.cantidad, it.notas, it.total_linea]
        );

        const detalleId = rDet.insertId;

        for (const op of it.opciones) {
          await conn.execute(
            `INSERT INTO orden_detalle_opciones
             (orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra)
             VALUES (?, ?, ?, ?, ?)`,
            [detalleId, op.modificador_id, op.opcion_id, op.opcion_nombre, op.precio_extra]
          );
        }
      }

      // historial estado inicial
      await conn.execute(
        `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
         VALUES (?, 'NUEVA', ?, ?)`,
        [ordenId, userId, "Orden creada"]
      );

      await conn.commit();

      await registrarBitacora(dbRaw, {
        usuario_id: userId,
        accion: "CREAR",
        entidad: "ordenes",
        entidad_id: ordenId,
        detalle: `Orden creada ${codigo} (${tipoUpper}) Total: ${total.toFixed(2)}`,
        ip: getIp(req),
      });

      // realtime
      const io = getIO(req);
      if (io) {
        io.emit("orden:nueva", {
          id: ordenId,
          codigo,
          tipo: tipoUpper,
          mesa: mesaVal,
          estado: "NUEVA",
          total,
        });
        await emitBadges(req);
      }

      res.status(201).json({ ok: true, id: ordenId, codigo });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  })
);

/* =========================================================
   PUT /api/ordenes/:id (EDITAR orden) SOLO si estado = NUEVA
   Roles: admin, supervisor, cajero
   body igual a crear (items, tipo, mesa, cliente_nombre, notas, descuento)
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const userId = req.user?.id;

    const [rows] = await execPool(`SELECT id, estado FROM ordenes WHERE id = ?`, [Number(id)]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });
    if (rows[0].estado !== "NUEVA") {
      return res.status(409).json({ ok: false, message: "Solo puedes editar una orden en estado NUEVA." });
    }

    const {
      tipo = "LLEVAR",
      mesa = null,
      cliente_nombre = null,
      notas = null,
      descuento = 0,
      items = [],
    } = req.body || {};

    const tipoUpper = String(tipo).toUpperCase();
    if (!TIPOS.includes(tipoUpper)) {
      return res.status(400).json({ ok: false, message: "Tipo inválido." });
    }

    const desc = Math.max(0, toNum(descuento, 0));
    const cliente = cliente_nombre ? String(cliente_nombre).trim().slice(0, 120) : null;
    const notasOrden = notas ? String(notas).trim().slice(0, 255) : null;
    const mesaVal = tipoUpper === "MESA" ? (mesa ? String(mesa).trim().slice(0, 20) : null) : null;

    if (!pool.getConnection) {
      return res.status(500).json({ ok: false, message: "Pool sin soporte de transacciones (getConnection)." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { items: itemsOK, subtotal } = await validarYPrepararItems(conn, items);
      const impuesto = 0;
      const total = Math.max(0, subtotal - desc + impuesto);

      // borrar detalle anterior (cascade borrará opciones)
      await conn.execute(`DELETE FROM orden_detalle WHERE orden_id = ?`, [Number(id)]);

      // reinsertar detalle
      for (const it of itemsOK) {
        const [rDet] = await conn.execute(
          `INSERT INTO orden_detalle
           (orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Number(id), it.producto_id, it.producto_nombre, it.precio_unitario, it.cantidad, it.notas, it.total_linea]
        );
        const detalleId = rDet.insertId;

        for (const op of it.opciones) {
          await conn.execute(
            `INSERT INTO orden_detalle_opciones
             (orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra)
             VALUES (?, ?, ?, ?, ?)`,
            [detalleId, op.modificador_id, op.opcion_id, op.opcion_nombre, op.precio_extra]
          );
        }
      }

      await conn.execute(
        `UPDATE ordenes
         SET cliente_nombre=?, tipo=?, mesa=?, notas=?, subtotal=?, descuento=?, impuesto=?, total=?
         WHERE id=?`,
        [cliente, tipoUpper, mesaVal, notasOrden, subtotal, desc, impuesto, total, Number(id)]
      );

      await conn.commit();

      await registrarBitacora(dbRaw, {
        usuario_id: userId,
        accion: "ACTUALIZAR",
        entidad: "ordenes",
        entidad_id: Number(id),
        detalle: `Orden actualizada. Total: ${total.toFixed(2)}`,
        ip: getIp(req),
      });

      const io = getIO(req);
      if (io) {
        io.emit("orden:actualizada", { id: Number(id) });
        await emitBadges(req);
      }

      res.json({ ok: true });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  })
);

/* =========================================================
   PATCH /api/ordenes/:id/estado
   body: { estado, comentario?, force? }
   Roles: admin, supervisor, cocina, cajero
========================================================= */
router.patch(
  "/:id/estado",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estado, comentario = null, force = 0 } = req.body || {};

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nextEstado = String(estado || "").toUpperCase();
    if (!ESTADOS.includes(nextEstado)) {
      return res.status(400).json({ ok: false, message: "Estado inválido." });
    }

    const [rows] = await execPool(
      `SELECT id, codigo, estado, tipo, mesa, total, asignado_cocina_por
       FROM ordenes
       WHERE id = ?`,
      [Number(id)]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });

    const orden = rows[0];
    const current = String(orden.estado);

    // reglas de transición (admin/supervisor puede forzar)
    const rol = (req.user?.rol || "").toLowerCase();
    const canForce = rol === "admin" || rol === "supervisor";
    const allowed = TRANSICIONES[current] || [];

    if (!canForce && Number(force) !== 1 && !allowed.includes(nextEstado)) {
      return res.status(409).json({
        ok: false,
        message: `Transición no permitida: ${current} → ${nextEstado}`,
      });
    }

    // Al pasar a EN_PREPARACION: registrar quién asignó a cocina si no existe
    let setAsignado = false;
    if (nextEstado === "EN_PREPARACION" && !orden.asignado_cocina_por) {
      setAsignado = true;
    }

    await execPool(
      `UPDATE ordenes
       SET estado = ? ${setAsignado ? ", asignado_cocina_por = ?" : ""}
       WHERE id = ?`,
      setAsignado ? [nextEstado, req.user?.id ?? null, Number(id)] : [nextEstado, Number(id)]
    );

    await execPool(
      `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
       VALUES (?, ?, ?, ?)`,
      [Number(id), nextEstado, req.user?.id ?? null, comentario ? String(comentario).slice(0, 255) : null]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "CAMBIAR_ESTADO",
      entidad: "ordenes",
      entidad_id: Number(id),
      detalle: `Orden ${orden.codigo}: ${current} → ${nextEstado}`,
      ip: getIp(req),
    });

    const io = getIO(req);
    if (io) {
      io.emit("orden:estado", { id: Number(id), codigo: orden.codigo, estado: nextEstado });
      await emitBadges(req);
    }

    res.json({ ok: true });
  })
);

module.exports = router;
