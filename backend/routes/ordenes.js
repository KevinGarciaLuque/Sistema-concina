import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* =========================
   DB pool compatible (db.js)
========================= */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* =========================
   Middlewares compatibles
========================= */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles =
  rolesMod.default ||
  rolesMod.allowRoles ||
  rolesMod.permitirRoles ||
  rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware roles en middleware/roles.js");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isInt = (v) => Number.isInteger(Number(v));
const toMoney = (v, def = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.round(n * 100) / 100;
};

const ESTADOS = new Set(["NUEVA", "EN_PREPARACION", "LISTA", "ENTREGADA", "ANULADA"]);
const TIPOS = new Set(["MESA", "LLEVAR", "DELIVERY"]);

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

function emitOrden(req, payload) {
  const io = getIO(req);
  if (!io) return;
  // Emitir a cocina y caja sin logging excesivo
  io.to("cocina").emit("ordenes:update", { ts: Date.now(), ...payload });
  io.to("caja").emit("ordenes:update", { ts: Date.now(), ...payload });
}

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : xf)?.split(",")[0]?.trim() || req.ip || null;
}

async function bitacoraSafe(req, { accion, entidad, entidad_id = null, detalle = null }) {
  try {
    await exec(
      `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user?.id ?? null, accion, entidad, entidad_id, detalle, getIp(req)]
    );
  } catch {}
}

/* =========================================================
   GET /api/ordenes
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina", "mesero"),
  asyncHandler(async (req, res) => {
    const { estado, tipo, desde, hasta, from, to, q, pendiente_cobro, sin_facturar } = req.query;

    const where = [];
    const params = [];

    // ✅ NUEVO: Filtro especial para órdenes pendientes de cobro
    const esPendienteCobro = pendiente_cobro === "1" || pendiente_cobro === "true";
    const soloSinFacturar = sin_facturar === "1" || sin_facturar === "true";

    if (esPendienteCobro) {
      // ✅ MODIFICADO: Incluir todas las órdenes sin facturar (excepto ANULADA)
      // Cualquier orden que no esté anulada puede ser cobrada desde el POS
      where.push("o.estado != 'ANULADA'");
      where.push("f.id IS NULL"); // Sin factura asociada
    } else {
      // ✅ NUEVO: Filtro genérico para excluir órdenes ya facturadas
      if (soloSinFacturar) {
        where.push("f.id IS NULL");
      }
      
      // Filtros normales
      if (estado) {
        // Soportar múltiples estados separados por coma
        const estadosArray = String(estado).split(',').map(e => e.trim()).filter(e => ESTADOS.has(e));
        if (estadosArray.length === 1) {
          where.push("o.estado = ?");
          params.push(estadosArray[0]);
        } else if (estadosArray.length > 1) {
          const placeholders = estadosArray.map(() => '?').join(',');
          where.push(`o.estado IN (${placeholders})`);
          params.push(...estadosArray);
        }
      }

      if (tipo && TIPOS.has(String(tipo))) {
        where.push("o.tipo = ?");
        params.push(String(tipo));
      }
    }

    // Soportar tanto desde/hasta como from/to para compatibilidad
    const fechaDesde = desde || from;
    const fechaHasta = hasta || to;

    if (fechaDesde) {
      where.push("o.fecha >= ?");
      params.push(String(fechaDesde));
    }

    if (fechaHasta) {
      where.push("o.fecha <= ?");
      params.push(String(fechaHasta));
    }

    if (q) {
      where.push("(o.codigo LIKE ? OR o.cliente_nombre LIKE ? OR o.mesa LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await exec(
      `
      SELECT
        o.id, o.fecha, o.numero_dia, o.codigo,
        o.cliente_nombre, o.tipo, o.mesa, o.estado, o.notas,
        o.creado_por, u1.nombre AS creado_por_nombre, u1.nombre AS mesero_nombre,
        o.asignado_cocina_por, u2.nombre AS asignado_cocina_por_nombre,
        o.subtotal, o.descuento, o.impuesto, o.total,
        o.created_at, o.updated_at,
        f.id AS factura_id,
        f.numero_factura,
        (SELECT COUNT(*) FROM orden_detalle od WHERE od.orden_id = o.id) AS items_count,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', od.id,
            'producto_id', od.producto_id,
            'producto_nombre', od.producto_nombre,
            'cantidad', od.cantidad,
            'precio_unitario', od.precio_unitario
          )
        )
        FROM orden_detalle od
        WHERE od.orden_id = o.id
        ) AS productos
      FROM ordenes o
      LEFT JOIN usuarios u1 ON u1.id = o.creado_por
      LEFT JOIN usuarios u2 ON u2.id = o.asignado_cocina_por
      LEFT JOIN facturas f ON f.orden_id = o.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY o.id DESC
      LIMIT 300
      `,
      params
    );

    // Parsear productos desde JSON (si es string) o usar directamente si ya es objeto
    const rowsWithProducts = rows.map(row => ({
      ...row,
      productos: row.productos 
        ? (typeof row.productos === 'string' ? JSON.parse(row.productos) : row.productos)
        : []
    }));

    res.json({ ok: true, data: rowsWithProducts });
  })
);

/* =========================================================
   GET /api/ordenes/kds
========================================================= */
router.get(
  "/kds",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina", "mesero"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      `
      SELECT
        o.id, o.fecha, o.numero_dia, o.codigo,
        o.cliente_nombre, o.tipo, o.mesa, o.estado, o.notas,
        o.subtotal, o.descuento, o.impuesto, o.total,
        o.created_at, o.updated_at,
        (SELECT COUNT(*) FROM orden_detalle od WHERE od.orden_id = o.id) AS items_count
      FROM ordenes o
      WHERE o.estado IN ('NUEVA','EN_PREPARACION','LISTA')
      ORDER BY o.id DESC
      LIMIT 200
      `
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/ordenes/:id
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina", "mesero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [oRows] = await exec(
      `
      SELECT
        o.*,
        u1.nombre AS creado_por_nombre,
        u2.nombre AS asignado_cocina_por_nombre
      FROM ordenes o
      LEFT JOIN usuarios u1 ON u1.id = o.creado_por
      LEFT JOIN usuarios u2 ON u2.id = o.asignado_cocina_por
      WHERE o.id = ?
      `,
      [Number(id)]
    );

    if (!oRows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });
    const orden = oRows[0];

    const [dRows] = await exec(
      `
      SELECT
        od.id, od.orden_id, od.producto_id,
        od.producto_nombre, od.precio_unitario, od.cantidad,
        od.notas, od.total_linea, od.created_at
      FROM orden_detalle od
      WHERE od.orden_id = ?
      ORDER BY od.id ASC
      `,
      [Number(id)]
    );

    const detalleIds = dRows.map((d) => d.id);
    let opciones = [];
    if (detalleIds.length) {
      const [opRows] = await exec(
        `
        SELECT
          odo.id, odo.orden_detalle_id,
          odo.modificador_id, odo.opcion_id,
          odo.opcion_nombre, odo.precio_extra
        FROM orden_detalle_opciones odo
        WHERE odo.orden_detalle_id IN (${detalleIds.map(() => "?").join(",")})
        ORDER BY odo.orden_detalle_id ASC, odo.id ASC
        `,
        detalleIds
      );
      opciones = opRows;
    }

    const opcionesByDetalle = {};
    for (const op of opciones) {
      if (!opcionesByDetalle[op.orden_detalle_id]) opcionesByDetalle[op.orden_detalle_id] = [];
      opcionesByDetalle[op.orden_detalle_id].push(op);
    }

    const detalle = dRows.map((d) => ({
      ...d,
      opciones: opcionesByDetalle[d.id] || [],
    }));

    const [hRows] = await exec(
      `
      SELECT h.id, h.orden_id, h.estado, h.cambiado_por, u.nombre AS cambiado_por_nombre,
             h.comentario, h.created_at
      FROM orden_estados_historial h
      LEFT JOIN usuarios u ON u.id = h.cambiado_por
      WHERE h.orden_id = ?
      ORDER BY h.id ASC
      `,
      [Number(id)]
    );

    res.json({ ok: true, data: { orden, detalle, historial: hRows } });
  })
);

/* =========================================================
   POST /api/ordenes
   - correlativo diario seguro en orden_correlativo
   - evita UTC/local usando fecha del MySQL
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    if (!pool.getConnection) {
      return res.status(500).json({ ok: false, message: "Pool sin soporte de transacciones (getConnection)." });
    }

    const cliente_nombre = req.body?.cliente_nombre ? String(req.body.cliente_nombre).trim().slice(0, 120) : null;
    const tipo = String(req.body?.tipo || "LLEVAR").toUpperCase();
    const mesa = req.body?.mesa ? String(req.body.mesa).trim().slice(0, 20) : null;
    const notas = req.body?.notas ? String(req.body.notas).trim().slice(0, 255) : null;

    if (!TIPOS.has(tipo)) return res.status(400).json({ ok: false, message: "tipo inválido." });
    if (tipo === "MESA" && (!mesa || mesa.length < 1)) {
      return res.status(400).json({ ok: false, message: "mesa es requerida cuando tipo = MESA." });
    }

    const descuento = toMoney(req.body?.descuento, 0);
    const impuesto = toMoney(req.body?.impuesto, 0);

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ ok: false, message: "La orden debe tener items." });

    const cleanItems = items.map((it) => ({
      producto_id: Number(it?.producto_id),
      cantidad: Number(it?.cantidad ?? 1),
      notas: it?.notas ? String(it.notas).trim().slice(0, 255) : null,
      opciones: Array.isArray(it?.opciones) ? it.opciones : [],
    }));

    for (const it of cleanItems) {
      if (!Number.isInteger(it.producto_id) || it.producto_id <= 0) {
        return res.status(400).json({ ok: false, message: "producto_id inválido en items." });
      }
      if (!Number.isInteger(it.cantidad) || it.cantidad <= 0) {
        return res.status(400).json({ ok: false, message: "cantidad inválida en items." });
      }
    }

    const conn = await pool.getConnection();
    const cexec = (sql, params = []) => (conn.execute ? conn.execute(sql, params) : conn.query(sql, params));

    try {
      await conn.beginTransaction();

      // ✅ fecha consistente tomada del MySQL (evita UTC/local)
      const [[{ fecha, yyyymmdd }]] = await cexec(
        `SELECT CURDATE() AS fecha, DATE_FORMAT(CURDATE(), '%Y%m%d') AS yyyymmdd`
      );

      // ✅ asegurar fila del día (requiere UNIQUE/PK en orden_correlativo.fecha)
      await cexec(
        `INSERT INTO orden_correlativo (fecha, ultimo_numero)
         VALUES (?, 0)
         ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero`,
        [fecha]
      );

      // ✅ incremento atómico + obtener número en la misma transacción
      await cexec(
        `UPDATE orden_correlativo
         SET ultimo_numero = LAST_INSERT_ID(ultimo_numero + 1)
         WHERE fecha = ?`,
        [fecha]
      );

      const [[{ numero_dia }]] = await cexec(`SELECT LAST_INSERT_ID() AS numero_dia`);

      const codigo = `ORD-${yyyymmdd}-${String(numero_dia).padStart(4, "0")}`;

      // cargar productos base de un solo golpe
      const prodIds = [...new Set(cleanItems.map((i) => i.producto_id))];
      const [pRows] = await cexec(
        `SELECT id, nombre, precio, activo, tasa_impuesto, requiere_cocina FROM productos WHERE id IN (${prodIds.map(() => "?").join(",")})`,
        prodIds
      );
      const prodMap = new Map(pRows.map((p) => [Number(p.id), p]));

      for (const pid of prodIds) {
        const p = prodMap.get(pid);
        if (!p) throw Object.assign(new Error("Producto no existe"), { status: 409, message: `Producto ${pid} no existe.` });
        if (Number(p.activo) !== 1) {
          throw Object.assign(new Error("Producto inactivo"), { status: 409, message: `Producto ${p.nombre} está inactivo.` });
        }
      }

      // cargar opciones si vienen
      const opcionIds = [];
      for (const it of cleanItems) {
        for (const op of it.opciones) {
          const oid = Number(op?.opcion_id);
          if (Number.isInteger(oid) && oid > 0) opcionIds.push(oid);
        }
      }
      const uniqueOpcionIds = [...new Set(opcionIds)];

      let opcionMap = new Map();
      if (uniqueOpcionIds.length) {
        const [oRows] = await cexec(
          `SELECT id, modificador_id, nombre, precio_extra, activo
           FROM modificador_opciones
           WHERE id IN (${uniqueOpcionIds.map(() => "?").join(",")})`,
          uniqueOpcionIds
        );
        opcionMap = new Map(oRows.map((o) => [Number(o.id), o]));

        for (const oid of uniqueOpcionIds) {
          const o = opcionMap.get(oid);
          if (!o) throw Object.assign(new Error("Opción no existe"), { status: 409, message: `Opción ${oid} no existe.` });
          if (Number(o.activo) !== 1) {
            throw Object.assign(new Error("Opción inactiva"), { status: 409, message: `Opción ${o.nombre} está inactiva.` });
          }
        }
      }

      // calcular totales
      let subtotal = 0;
      const computed = [];

      for (const it of cleanItems) {
        const p = prodMap.get(it.producto_id);
        const precio_unitario = toMoney(p.precio, 0);

        let extraUnit = 0;
        const opcionesComputed = [];

        for (const op of it.opciones) {
          const oid = Number(op?.opcion_id);
          if (!Number.isInteger(oid) || oid <= 0) continue;

          const o = opcionMap.get(oid);
          const precio_extra = toMoney(o.precio_extra, 0);
          extraUnit += precio_extra;

          opcionesComputed.push({
            modificador_id: Number(o.modificador_id),
            opcion_id: Number(o.id),
            opcion_nombre: String(o.nombre),
            precio_extra,
          });
        }

        const total_linea = toMoney((precio_unitario + extraUnit) * it.cantidad, 0);
        subtotal += total_linea;

        computed.push({
          producto_id: it.producto_id,
          producto_nombre: String(p.nombre),
          precio_unitario,
          cantidad: it.cantidad,
          notas: it.notas,
          total_linea,
          tasa_impuesto: Number(p.tasa_impuesto || 15),
          opciones: opcionesComputed,
        });
      }

      subtotal = toMoney(subtotal, 0);
      const total = toMoney(subtotal - descuento + impuesto, 0);
      if (total < 0) {
        throw Object.assign(new Error("Total inválido"), { status: 400, message: "El total no puede ser negativo." });
      }

      // ✅ NUEVO: Detectar si todos los productos NO requieren cocina
      const todosItemsRapidos = cleanItems.every(item => {
        const producto = prodMap.get(item.producto_id);
        return producto && Number(producto.requiere_cocina) === 0;
      });
      
      // Si todos los items son "rápidos" (no requieren cocina), estado inicial = LISTA
      // Si al menos uno requiere cocina, estado inicial = NUEVA
      const estadoInicial = todosItemsRapidos ? 'LISTA' : 'NUEVA';

      // insertar orden
      const [rOrden] = await cexec(
        `
        INSERT INTO ordenes
          (fecha, numero_dia, codigo, cliente_nombre, tipo, mesa, estado, notas, creado_por,
           subtotal, descuento, impuesto, total)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          fecha,
          numero_dia,
          codigo,
          cliente_nombre,
          tipo,
          mesa,
          estadoInicial,
          notas,
          Number(req.user?.id ?? null),
          subtotal,
          descuento,
          impuesto,
          total,
        ]
      );

      const ordenId = rOrden.insertId;

      // insertar detalle + opciones
      for (const line of computed) {
        const [rDet] = await cexec(
          `
          INSERT INTO orden_detalle
            (orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, tasa_impuesto)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            Number(ordenId),
            Number(line.producto_id),
            line.producto_nombre,
            line.precio_unitario,
            Number(line.cantidad),
            line.notas,
            line.total_linea,
            Number(line.tasa_impuesto || 15),
          ]
        );

        const detId = rDet.insertId;

        for (const op of line.opciones) {
          await cexec(
            `
            INSERT INTO orden_detalle_opciones
              (orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra)
            VALUES
              (?, ?, ?, ?, ?)
            `,
            [Number(detId), Number(op.modificador_id), Number(op.opcion_id), op.opcion_nombre, op.precio_extra]
          );
        }
      }

      // historial estado inicial
      await cexec(
        `
        INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
        VALUES (?, 'NUEVA', ?, 'Orden creada')
        `,
        [Number(ordenId), Number(req.user?.id ?? null)]
      );

      await conn.commit();

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "ordenes",
        entidad_id: Number(ordenId),
        detalle: `Orden ${codigo} creada. Total: L ${total.toFixed(2)}`,
      });

      emitOrden(req, { action: "created", id: Number(ordenId), codigo, estado: "NUEVA" });

      res.status(201).json({ ok: true, id: Number(ordenId), codigo });
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}

      // Si por alguna razón extrema chocara el unique, devolvemos 409 (más semántico)
      if (String(e?.code || "").includes("ER_DUP_ENTRY")) {
        return res.status(409).json({ ok: false, message: "Código de orden duplicado. Reintenta." });
      }

      const status = e?.status || 500;
      const message = e?.message || "Error al crear orden.";
      return res.status(status).json({ ok: false, message });
    } finally {
      conn.release();
    }
  })
);

/* =========================================================
   POST /api/ordenes/:id/items - Agregar items a orden existente
========================================================= */
router.post(
  "/:id/items",
  requireAuth,
  allowRoles("admin", "supervisor", "mesero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID de orden inválido." });

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "Envíe al menos un item." });
    }

    // Validar estructura de items
    const cleanItems = [];
    for (const it of items) {
      const pid = Number(it?.producto_id);
      if (!Number.isInteger(pid) || pid <= 0) {
        return res.status(400).json({ ok: false, message: "producto_id inválido." });
      }

      const cantidad = Number(it?.cantidad ?? 1);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return res.status(400).json({ ok: false, message: "cantidad inválida." });
      }

      const notas = it?.notas ? String(it.notas).trim() : null;
      const opciones = Array.isArray(it?.opciones) ? it.opciones : [];

      cleanItems.push({ producto_id: pid, cantidad, notas, opciones });
    }

    const conn = await pool.getConnection();
    const cexec = (sql, params = []) => (conn.execute ? conn.execute(sql, params) : conn.query(sql, params));

    try {
      await conn.beginTransaction();

      // Verificar que la orden existe y no está facturada
      const [[orden]] = await cexec(
        `SELECT o.id, o.codigo, o.estado, o.subtotal, o.total, f.id AS factura_id
         FROM ordenes o
         LEFT JOIN facturas f ON f.orden_id = o.id
         WHERE o.id = ?`,
        [id]
      );

      if (!orden) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: "Orden no encontrada." });
      }

      if (orden.factura_id) {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "No se pueden agregar items a una orden ya facturada." });
      }

      if (orden.estado === "ANULADA") {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "No se pueden agregar items a una orden anulada." });
      }

      // Cargar productos
      const prodIds = [...new Set(cleanItems.map((i) => i.producto_id))];
      const [pRows] = await cexec(
        `SELECT id, nombre, precio, activo, tasa_impuesto, requiere_cocina FROM productos WHERE id IN (${prodIds.map(() => "?").join(",")})`,
        prodIds
      );
      const prodMap = new Map(pRows.map((p) => [Number(p.id), p]));

      for (const pid of prodIds) {
        const p = prodMap.get(pid);
        if (!p) throw Object.assign(new Error("Producto no existe"), { status: 409, message: `Producto ${pid} no existe.` });
        if (Number(p.activo) !== 1) {
          throw Object.assign(new Error("Producto inactivo"), { status: 409, message: `Producto ${p.nombre} está inactivo.` });
        }
      }

      // Cargar opciones si vienen
      const opcionIds = [];
      for (const it of cleanItems) {
        for (const op of it.opciones) {
          const oid = Number(op?.opcion_id);
          if (Number.isInteger(oid) && oid > 0) opcionIds.push(oid);
        }
      }
      const uniqueOpcionIds = [...new Set(opcionIds)];

      let opcionMap = new Map();
      if (uniqueOpcionIds.length) {
        const [oRows] = await cexec(
          `SELECT id, modificador_id, nombre, precio_extra, activo
           FROM modificador_opciones
           WHERE id IN (${uniqueOpcionIds.map(() => "?").join(",")})`,
          uniqueOpcionIds
        );
        opcionMap = new Map(oRows.map((o) => [Number(o.id), o]));

        for (const oid of uniqueOpcionIds) {
          const o = opcionMap.get(oid);
          if (!o) throw Object.assign(new Error("Opción no existe"), { status: 409, message: `Opción ${oid} no existe.` });
          if (Number(o.activo) !== 1) {
            throw Object.assign(new Error("Opción inactiva"), { status: 409, message: `Opción ${o.nombre} está inactiva.` });
          }
        }
      }

      // Calcular nuevos totales
      let nuevoSubtotalItems = 0;
      const computed = [];

      for (const it of cleanItems) {
        const p = prodMap.get(it.producto_id);
        const precio_unitario = toMoney(p.precio, 0);

        let extraUnit = 0;
        const opcionesComputed = [];

        for (const op of it.opciones) {
          const oid = Number(op?.opcion_id);
          if (!Number.isInteger(oid) || oid <= 0) continue;

          const o = opcionMap.get(oid);
          const precio_extra = toMoney(o.precio_extra, 0);
          extraUnit += precio_extra;

          opcionesComputed.push({
            modificador_id: Number(o.modificador_id),
            opcion_id: Number(o.id),
            opcion_nombre: String(o.nombre),
            precio_extra,
          });
        }

        const total_linea = toMoney((precio_unitario + extraUnit) * it.cantidad, 0);
        nuevoSubtotalItems += total_linea;

        computed.push({
          producto_id: it.producto_id,
          producto_nombre: String(p.nombre),
          precio_unitario,
          cantidad: it.cantidad,
          notas: it.notas,
          total_linea,
          tasa_impuesto: Number(p.tasa_impuesto || 15),
          opciones: opcionesComputed,
        });
      }

      // Actualizar totales de la orden
      const nuevoSubtotal = toMoney(Number(orden.subtotal) + nuevoSubtotalItems, 0);
      const nuevoTotal = toMoney(nuevoSubtotal, 0); // Por ahora sin descuentos/impuestos adicionales

      await cexec(
        `UPDATE ordenes SET subtotal = ?, total = ?, updated_at = NOW() WHERE id = ?`,
        [nuevoSubtotal, nuevoTotal, id]
      );

      // Insertar nuevos items
      for (const line of computed) {
        const [rDet] = await cexec(
          `
          INSERT INTO orden_detalle
            (orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, tasa_impuesto)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            line.producto_id,
            line.producto_nombre,
            line.precio_unitario,
            line.cantidad,
            line.notas,
            line.total_linea,
            Number(line.tasa_impuesto || 15),
          ]
        );

        const detId = rDet.insertId;

        for (const op of line.opciones) {
          await cexec(
            `
            INSERT INTO orden_detalle_opciones
              (orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra)
            VALUES
              (?, ?, ?, ?, ?)
            `,
            [Number(detId), Number(op.modificador_id), Number(op.opcion_id), op.opcion_nombre, op.precio_extra]
          );
        }
      }

      // Si la orden está en LISTA y se agregan items que requieren cocina, volver a NUEVA
      const hayItemsQuRequierenCocina = computed.some(item => {
        const producto = prodMap.get(item.producto_id);
        return producto && Number(producto.requiere_cocina) === 1;
      });

      if (orden.estado === "LISTA" && hayItemsQuRequierenCocina) {
        await cexec(`UPDATE ordenes SET estado = 'NUEVA' WHERE id = ?`, [id]);
        await cexec(
          `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
           VALUES (?, 'NUEVA', ?, 'Orden volvió a NUEVA por agregar items que requieren cocina')`,
          [id, Number(req.user?.id ?? null)]
        );
      }

      await conn.commit();

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "ordenes",
        entidad_id: Number(id),
        detalle: `Agregados ${computed.length} items a orden ${orden.codigo}. Nuevo total: L ${nuevoTotal.toFixed(2)}`,
      });

      emitOrden(req, { action: "updated", id: Number(id), codigo: orden.codigo, estado: hayItemsQuRequierenCocina && orden.estado === "LISTA" ? "NUEVA" : orden.estado });

      res.json({ ok: true, message: "Items agregados exitosamente." });
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}

      const status = e?.status || 500;
      const message = e?.message || "Error al agregar items.";
      return res.status(status).json({ ok: false, message });
    } finally {
      conn.release();
    }
  })
);

/* =========================================================
   PATCH /api/ordenes/:id/estado
========================================================= */
router.patch(
  "/:id/estado",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nuevo = String(req.body?.estado || "").toUpperCase();
    const comentario = req.body?.comentario ? String(req.body.comentario).trim().slice(0, 255) : null;

    if (!ESTADOS.has(nuevo)) return res.status(400).json({ ok: false, message: "estado inválido." });

    const [rows] = await exec(`SELECT id, codigo, estado, asignado_cocina_por FROM ordenes WHERE id=?`, [Number(id)]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });

    const orden = rows[0];

    if (orden.estado === "ANULADA" && nuevo !== "ANULADA") {
      return res.status(409).json({ ok: false, message: "No puedes cambiar una orden ANULADA." });
    }

    const uid = Number(req.user?.id ?? null);
    let setAsignado = "";
    const params = [nuevo];

    if (nuevo === "EN_PREPARACION" && !orden.asignado_cocina_por) {
      setAsignado = ", asignado_cocina_por = ?";
      params.push(uid);
    }

    params.push(Number(id));

    await exec(`UPDATE ordenes SET estado = ? ${setAsignado} WHERE id = ?`, params);

    await exec(
      `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
       VALUES (?, ?, ?, ?)`,
      [Number(id), nuevo, uid, comentario]
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "ordenes",
      entidad_id: Number(id),
      detalle: `Estado ${orden.codigo}: ${orden.estado} -> ${nuevo}`,
    });

    emitOrden(req, { action: "estado", id: Number(id), codigo: orden.codigo, from: orden.estado, to: nuevo });

    res.json({ ok: true });
  })
);

/* =========================================================
   PATCH /api/ordenes/:id/entregar
   Marcar orden como ENTREGADA (para deliveries facturados)
========================================================= */
router.patch(
  "/:id/entregar",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `SELECT o.id, o.codigo, o.estado, o.tipo, f.id AS factura_id
       FROM ordenes o
       LEFT JOIN facturas f ON f.orden_id = o.id
       WHERE o.id = ?`,
      [Number(id)]
    );
    
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "Orden no encontrada." });
    }

    const orden = rows[0];

    // Validar que esté facturada
    if (!orden.factura_id) {
      return res.status(400).json({ ok: false, message: "La orden debe estar facturada antes de entregarla." });
    }

    // Validar que sea DELIVERY (opcional, pero recomendado)
    const tipoOrden = String(orden.tipo || "").toUpperCase();
    if (tipoOrden !== "DELIVERY") {
      return res.status(400).json({ ok: false, message: "Solo órdenes DELIVERY requieren entrega manual." });
    }

    // Validar estado actual
    const estadoActual = String(orden.estado || "").toUpperCase();
    if (estadoActual === "ENTREGADA") {
      return res.status(409).json({ ok: false, message: "La orden ya está marcada como ENTREGADA." });
    }

    if (estadoActual === "ANULADA") {
      return res.status(409).json({ ok: false, message: "No se puede entregar una orden ANULADA." });
    }

    // Actualizar a ENTREGADA
    await exec(`UPDATE ordenes SET estado = 'ENTREGADA' WHERE id = ?`, [Number(id)]);

    const uid = Number(req.user?.id ?? null);

    // Registrar en historial
    await exec(
      `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
       VALUES (?, 'ENTREGADA', ?, 'Entrega manual de delivery')`,
      [Number(id), uid]
    );

    await bitacoraSafe(req, {
      accion: "ENTREGAR",
      entidad: "ordenes",
      entidad_id: Number(id),
      detalle: `Orden ${orden.codigo} marcada como ENTREGADA`,
    });

    emitOrden(req, { action: "entregada", id: Number(id), codigo: orden.codigo });

    res.json({ ok: true, message: "Orden marcada como ENTREGADA" });
  })
);

export default router;
