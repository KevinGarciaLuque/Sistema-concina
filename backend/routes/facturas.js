// backend/routes/facturas.js
import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* =========================
   DB pool compatible
========================= */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) {
  throw new Error(
    "No se pudo obtener el pool de DB desde db.js (export default o export const pool)."
  );
}

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* =========================
   Middlewares compatibles
========================= */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles =
  rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware de auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware de roles en middleware/roles.js");

/* =========================
   Helpers
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isInt = (v) => Number.isInteger(Number(v));
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// Si tu UI manda MIXTO como un método, lo aceptamos.
// (También puedes mandar varios pagos: EFECTIVO + TARJETA, etc.)
const METODOS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"];

function pad(n, len = 6) {
  return String(Number(n)).padStart(len, "0");
}

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : xf)?.split(",")[0]?.trim() || req.ip || null;
}

// Bitácora safe (no tumba request)
async function registrarBitacoraSafe(req, payload) {
  try {
    const { usuario_id, accion, entidad, entidad_id = null, detalle = null } = payload;
    await exec(
      `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id ?? null, accion, entidad, entidad_id, detalle, getIp(req)]
    );
  } catch {}
}

async function emitirBadges(req) {
  const io = getIO(req);
  if (!io) return;

  const [[a]] = await exec(
    `SELECT COUNT(*) AS facturas_hoy
     FROM facturas
     WHERE DATE(created_at) = CURDATE()`
  );

  const [[b]] = await exec(
    `SELECT COUNT(*) AS ordenes_hoy
     FROM ordenes
     WHERE fecha = CURDATE() AND estado <> 'ANULADA'`
  );

  const [[c]] = await exec(
    `SELECT COUNT(*) AS en_cocina
     FROM ordenes
     WHERE fecha = CURDATE() AND estado = 'EN_PREPARACION'`
  );

  io.emit("badge:update", {
    facturas: Number(a?.facturas_hoy || 0),
    ordenes: Number(b?.ordenes_hoy || 0),
    cocina: Number(c?.en_cocina || 0),
  });
}

// ✅ Caja activa (pool o conn)
async function getCajaActiva(userId, conn = null) {
  const runner = conn?.execute ? conn : { execute: exec };
  const [rows] = await runner.execute(
    `SELECT id
     FROM caja_sesiones
     WHERE usuario_id = ? AND estado = 'ABIERTA'
     ORDER BY id DESC
     LIMIT 1`,
    [Number(userId)]
  );
  return rows[0]?.id || null;
}

// ✅ Emit update para que el módulo Caja se refresque
function emitCajaUpdate(req, payload) {
  const io = getIO(req);
  if (!io) return;
  io.to("caja").emit("caja:update", { ts: Date.now(), ...payload });
}

async function cargarDetalleOrden(ordenId) {
  const [ordenRows] = await exec(
    `SELECT id, codigo, fecha, numero_dia, cliente_nombre, tipo, mesa, estado, notas,
            subtotal, descuento, impuesto, total, creado_por, asignado_cocina_por,
            created_at, updated_at
     FROM ordenes
     WHERE id = ?`,
    [Number(ordenId)]
  );
  if (!ordenRows.length) return null;

  const orden = ordenRows[0];

  const [det] = await exec(
    `SELECT id, orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, created_at
     FROM orden_detalle
     WHERE orden_id = ?
     ORDER BY id ASC`,
    [Number(ordenId)]
  );

  const detIds = det.map((d) => Number(d.id));
  let ops = [];
  if (detIds.length) {
    const [opsRows] = await exec(
      `SELECT id, orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra
       FROM orden_detalle_opciones
       WHERE orden_detalle_id IN (${detIds.map(() => "?").join(",")})
       ORDER BY orden_detalle_id ASC, id ASC`,
      detIds
    );
    ops = opsRows;
  }

  const opsByDet = new Map();
  for (const o of ops) {
    const did = Number(o.orden_detalle_id);
    if (!opsByDet.has(did)) opsByDet.set(did, []);
    opsByDet.get(did).push(o);
  }

  const detalle = det.map((d) => ({
    ...d,
    opciones: opsByDet.get(Number(d.id)) || [],
  }));

  return { orden, detalle };
}

/* =========================================================
   GET /api/facturas
   filtros: desde, hasta, q (numero/cliente/codigo orden), caja_sesion_id
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { desde, hasta, q, caja_sesion_id } = req.query;

    const where = [];
    const params = [];

    if (desde) {
      where.push("DATE(f.created_at) >= ?");
      params.push(String(desde));
    }
    if (hasta) {
      where.push("DATE(f.created_at) <= ?");
      params.push(String(hasta));
    }
    if (caja_sesion_id !== undefined && caja_sesion_id !== "" && isInt(caja_sesion_id)) {
      where.push("f.caja_sesion_id = ?");
      params.push(Number(caja_sesion_id));
    }
    if (q) {
      where.push("(f.numero_factura LIKE ? OR f.cliente_nombre LIKE ? OR o.codigo LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // seguridad: si es cajero, solo ve lo de su caja activa (si existe)
    const rol = String(req.user?.rol || "").toLowerCase();
    if (rol === "cajero") {
      const cajaId = await getCajaActiva(req.user?.id);
      if (cajaId) {
        where.push("f.caja_sesion_id = ?");
        params.push(Number(cajaId));
      } else {
        where.push("1 = 0");
      }
    }

    const sql = `
      SELECT
        f.id, f.orden_id, o.codigo AS orden_codigo,
        f.caja_sesion_id,
        f.numero_factura, f.es_copia,
        f.cliente_nombre, f.cliente_rtn, f.cliente_direccion,
        f.subtotal, f.descuento, f.impuesto, f.total,
        f.created_at
      FROM facturas f
      INNER JOIN ordenes o ON o.id = f.orden_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY f.id DESC
      LIMIT 300
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/facturas/por-orden/:ordenId
========================================================= */
router.get(
  "/por-orden/:ordenId",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { ordenId } = req.params;
    if (!isInt(ordenId)) return res.status(400).json({ ok: false, message: "ordenId inválido." });

    const [rows] = await exec(
      `SELECT id, orden_id, caja_sesion_id, numero_factura, es_copia, cliente_nombre, cliente_rtn, cliente_direccion,
              subtotal, descuento, impuesto, total, created_at
       FROM facturas
       WHERE orden_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [Number(ordenId)]
    );

    res.json({ ok: true, data: rows[0] || null });
  })
);

/* =========================================================
   GET /api/facturas/:id
   query: copia=1 -> solo para imprimir "COPIA" (no toca BD)
   Devuelve: factura + pagos + orden + detalle
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const copia = String(req.query.copia || "0") === "1";

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [fRows] = await exec(
      `SELECT
         f.id, f.orden_id, f.caja_sesion_id, f.numero_factura, f.es_copia,
         f.cliente_nombre, f.cliente_rtn, f.cliente_direccion,
         f.subtotal, f.descuento, f.impuesto, f.total, f.created_at
       FROM facturas f
       WHERE f.id = ?`,
      [Number(id)]
    );

    if (!fRows.length) return res.status(404).json({ ok: false, message: "Factura no encontrada." });

    const factura = fRows[0];

    // seguridad cajero: solo lo de su caja activa (si existe)
    const rol = String(req.user?.rol || "").toLowerCase();
    if (rol === "cajero") {
      const cajaId = await getCajaActiva(req.user?.id);
      if (!cajaId || Number(factura.caja_sesion_id) !== Number(cajaId)) {
        return res.status(403).json({ ok: false, message: "No autorizado." });
      }
    }

    const [pagos] = await exec(
      `SELECT id, factura_id, metodo, monto, referencia, efectivo_recibido, cambio, created_at
       FROM pagos
       WHERE factura_id = ?
       ORDER BY id ASC`,
      [Number(id)]
    );

    const od = await cargarDetalleOrden(factura.orden_id);
    if (!od) return res.status(409).json({ ok: false, message: "La orden asociada no existe." });

    res.json({
      ok: true,
      data: {
        copia,
        factura,
        pagos,
        orden: od.orden,
        detalle: od.detalle,
      },
    });
  })
);

/* =========================================================
   POST /api/facturas
   Roles: admin, supervisor, cajero
   body:
   {
     orden_id,
     cliente_nombre?, cliente_rtn?, cliente_direccion?,
     pagos: [
       { metodo, monto, referencia?, efectivo_recibido? }
     ]
   }

   ✅ CORRECCIÓN CLAVE:
   - Requiere caja ABIERTA para facturar (admin/supervisor/cajero)
   - Emite "caja:update" para refrescar módulo Caja
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    const {
      orden_id,
      cliente_nombre = null,
      cliente_rtn = null,
      cliente_direccion = null,
      pagos = [],
    } = req.body || {};

    if (!isInt(orden_id)) {
      return res.status(400).json({ ok: false, message: "orden_id inválido." });
    }

    if (!Array.isArray(pagos) || pagos.length === 0) {
      return res.status(400).json({ ok: false, message: "Debes enviar al menos 1 pago." });
    }

    if (!pool.getConnection) {
      return res.status(500).json({
        ok: false,
        message: "Pool sin soporte de transacciones (getConnection).",
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // ✅ Requiere caja abierta para facturar (para TODOS)
      const cajaSesionId = await getCajaActiva(userId, conn);
      if (!cajaSesionId) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          code: "CAJA_CERRADA",
          message: "No hay caja abierta. Abre caja para facturar.",
        });
      }

      // Orden (lock)
      const [oRows] = await conn.execute(
        `SELECT id, codigo, estado, cliente_nombre, subtotal, descuento, impuesto, total
         FROM ordenes
         WHERE id = ?
         FOR UPDATE`,
        [Number(orden_id)]
      );

      if (!oRows.length) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: "Orden no encontrada." });
      }

      const orden = oRows[0];

      if (String(orden.estado).toUpperCase() === "ANULADA") {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "No se puede facturar una orden ANULADA." });
      }

      // Evitar facturar 2 veces la misma orden (lock)
      const [existe] = await conn.execute(
        `SELECT id FROM facturas WHERE orden_id = ? LIMIT 1 FOR UPDATE`,
        [Number(orden_id)]
      );
      if (existe.length) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          code: "ORDEN_YA_FACTURADA",
          message: "Esta orden ya fue facturada.",
          factura_id: existe[0].id,
        });
      }

      // Totales desde la orden (fuente de verdad)
      const subtotal = toNum(orden.subtotal, 0);
      const descuento = toNum(orden.descuento, 0);
      const impuesto = toNum(orden.impuesto, 0);
      const total = toNum(orden.total, 0);

      // Cliente (si no lo mandan, usa el de la orden)
      const cNombre = cliente_nombre ?? orden.cliente_nombre ?? null;
      const cRTN = cliente_rtn ?? null;
      const cDir = cliente_direccion ?? null;

      // Validación y normalización pagos
      const pagosNorm = pagos.map((p) => {
        const metodo = String(p?.metodo || "EFECTIVO").toUpperCase();
        const monto = toNum(p?.monto, 0);

        return {
          metodo: METODOS.includes(metodo) ? metodo : "EFECTIVO",
          monto,
          referencia: p?.referencia ? String(p.referencia).trim().slice(0, 60) : null,
          // null si no viene; número si viene
          efectivo_recibido:
            p?.efectivo_recibido === undefined || p?.efectivo_recibido === null
              ? null
              : toNum(p.efectivo_recibido, 0),
        };
      });

      if (pagosNorm.some((p) => p.monto <= 0)) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "Cada pago debe tener monto > 0." });
      }

      const sumaPagos = pagosNorm.reduce((acc, p) => acc + p.monto, 0);
      const diff = Math.abs(sumaPagos - total);

      // tolerancia por redondeos
      if (diff > 0.01) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          code: "PAGOS_NO_CUADRAN",
          message: `Los pagos (${sumaPagos.toFixed(2)}) no cuadran con el total (${total.toFixed(
            2
          )}).`,
        });
      }

      // Crear factura con número temporal
      const temp = `TMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      const [rFactura] = await conn.execute(
        `INSERT INTO facturas
         (orden_id, caja_sesion_id, numero_factura, es_copia,
          cliente_nombre, cliente_rtn, cliente_direccion,
          subtotal, descuento, impuesto, total)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(orden_id),
          Number(cajaSesionId),
          temp,
          cNombre ? String(cNombre).trim().slice(0, 120) : null,
          cRTN ? String(cRTN).trim().slice(0, 30) : null,
          cDir ? String(cDir).trim().slice(0, 200) : null,
          subtotal,
          descuento,
          impuesto,
          total,
        ]
      );

      const facturaId = rFactura.insertId;

      // número final bonito y estable
      const [[hoyRow]] = await conn.execute(`SELECT DATE_FORMAT(NOW(), '%Y%m%d') AS ymd`);
      const numeroFactura = `F-${hoyRow.ymd}-${pad(facturaId, 6)}`;

      await conn.execute(`UPDATE facturas SET numero_factura = ? WHERE id = ?`, [
        numeroFactura,
        Number(facturaId),
      ]);

      // Insert pagos
      for (const p of pagosNorm) {
        let cambio = null;
        let efectivo_recibido = p.efectivo_recibido;

        if (p.metodo === "EFECTIVO") {
          if (efectivo_recibido === null) efectivo_recibido = p.monto;
          cambio = Math.max(0, toNum(efectivo_recibido, p.monto) - p.monto);
        }

        await conn.execute(
          `INSERT INTO pagos
           (factura_id, metodo, monto, referencia, efectivo_recibido, cambio)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            Number(facturaId),
            p.metodo,
            p.monto,
            p.referencia,
            efectivo_recibido,
            cambio,
          ]
        );
      }

      // Marcar orden como ENTREGADA tras cobro (si aplica)
      if (String(orden.estado).toUpperCase() !== "ENTREGADA") {
        await conn.execute(`UPDATE ordenes SET estado = 'ENTREGADA' WHERE id = ?`, [
          Number(orden_id),
        ]);

        // si tu tabla existe (tu proyecto la usa), registramos historial
        try {
          await conn.execute(
            `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
             VALUES (?, 'ENTREGADA', ?, ?)`,
            [Number(orden_id), userId ?? null, `Facturada ${numeroFactura}`]
          );
        } catch {
          // si no existe la tabla, no tumbamos la venta
        }
      }

      await conn.commit();

      await registrarBitacoraSafe(req, {
        usuario_id: userId ?? null,
        accion: "CREAR",
        entidad: "facturas",
        entidad_id: Number(facturaId),
        detalle: `Factura ${numeroFactura} creada para orden ${orden.codigo}. Total ${total.toFixed(
          2
        )}`,
      });

      // realtime
      const io = getIO(req);
      if (io) {
        io.to("caja").emit("factura:nueva", {
          id: Number(facturaId),
          numero_factura: numeroFactura,
          orden_id: Number(orden_id),
          orden_codigo: orden.codigo,
          caja_sesion_id: Number(cajaSesionId),
          total,
        });

        // ✅ clave: Caja.jsx escucha "caja:update"
        emitCajaUpdate(req, {
          action: "factura_creada",
          caja_sesion_id: Number(cajaSesionId),
          factura_id: Number(facturaId),
          total,
        });

        io.emit("orden:estado", { id: Number(orden_id), codigo: orden.codigo, estado: "ENTREGADA" });
        await emitirBadges(req);
      }

      res.status(201).json({
        ok: true,
        id: Number(facturaId),
        numero_factura: numeroFactura,
        caja_sesion_id: Number(cajaSesionId),
      });
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}
      throw e;
    } finally {
      conn.release();
    }
  })
);

export default router;
