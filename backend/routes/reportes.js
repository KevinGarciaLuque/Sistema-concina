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
  throw new Error("No se pudo obtener el pool de DB desde db.js (export default o export const pool).");
}

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* =========================
   Middlewares compatibles
========================= */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware de auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware de roles en middleware/roles.js");

/* =========================
   Helpers
========================= */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function getDateRange(query) {
  // Por defecto: HOY
  const desde = query.desde ? String(query.desde) : null;
  const hasta = query.hasta ? String(query.hasta) : null;

  if (!desde && !hasta) return { useToday: true, desde: null, hasta: null };
  return { useToday: false, desde, hasta: hasta || desde };
}

async function getCajaActiva(userId) {
  const [rows] = await exec(
    `SELECT id
     FROM caja_sesiones
     WHERE usuario_id = ? AND estado = 'ABIERTA'
     ORDER BY id DESC
     LIMIT 1`,
    [Number(userId)]
  );
  return rows[0]?.id || null;
}

function buildWhereFacturas({ useToday, desde, hasta, caja_sesion_id }) {
  const where = [];
  const params = [];

  if (useToday) {
    where.push("DATE(f.created_at) = CURDATE()");
  } else {
    if (desde) {
      where.push("DATE(f.created_at) >= ?");
      params.push(desde);
    }
    if (hasta) {
      where.push("DATE(f.created_at) <= ?");
      params.push(hasta);
    }
  }

  if (caja_sesion_id !== undefined && caja_sesion_id !== "" && isInt(caja_sesion_id)) {
    where.push("f.caja_sesion_id = ?");
    params.push(Number(caja_sesion_id));
  }

  return { where, params };
}

function buildWhereOrdenes({ useToday, desde, hasta }) {
  const where = [];
  const params = [];

  if (useToday) {
    where.push("o.fecha = CURDATE()");
  } else {
    if (desde) {
      where.push("o.fecha >= ?");
      params.push(desde);
    }
    if (hasta) {
      where.push("o.fecha <= ?");
      params.push(hasta);
    }
  }

  return { where, params };
}

/* =========================================================
   GET /api/reportes/resumen
   query: desde, hasta, caja_sesion_id
   KPIs por rango (o hoy por defecto)
========================================================= */
router.get(
  "/resumen",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const { caja_sesion_id } = req.query;

    const { where, params } = buildWhereFacturas({ ...range, caja_sesion_id });

    const sql = `
      SELECT
        COUNT(*) AS facturas_count,
        COALESCE(SUM(f.subtotal), 0) AS subtotal_total,
        COALESCE(SUM(f.descuento), 0) AS descuento_total,
        COALESCE(SUM(f.impuesto), 0) AS impuesto_total,
        COALESCE(SUM(f.total), 0) AS ventas_total,
        COALESCE(AVG(NULLIF(f.total, 0)), 0) AS ticket_promedio
      FROM facturas f
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;

    const [[kpis]] = await exec(sql, params);

    // Totales por método en el mismo rango
    const { where: w2, params: p2 } = buildWhereFacturas({ ...range, caja_sesion_id });
    const [metodos] = await exec(
      `
      SELECT p.metodo, COALESCE(SUM(p.monto), 0) AS total, COUNT(*) AS pagos_count
      FROM pagos p
      INNER JOIN facturas f ON f.id = p.factura_id
      ${w2.length ? "WHERE " + w2.join(" AND ") : ""}
      GROUP BY p.metodo
      ORDER BY p.metodo
      `,
      p2
    );

    res.json({ ok: true, data: { kpis, metodos } });
  })
);

/* =========================================================
   GET /api/reportes/serie-ventas
   query: desde, hasta, caja_sesion_id
   Para gráficas (ventas por día)
========================================================= */
router.get(
  "/serie-ventas",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const { caja_sesion_id } = req.query;

    const { where, params } = buildWhereFacturas({ ...range, caja_sesion_id });

    const [rows] = await exec(
      `
      SELECT
        DATE(f.created_at) AS fecha,
        COUNT(*) AS facturas_count,
        COALESCE(SUM(f.total), 0) AS ventas_total
      FROM facturas f
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY DATE(f.created_at)
      ORDER BY DATE(f.created_at) ASC
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/reportes/por-metodo
   query: desde, hasta, caja_sesion_id
========================================================= */
router.get(
  "/por-metodo",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const { caja_sesion_id } = req.query;

    const { where, params } = buildWhereFacturas({ ...range, caja_sesion_id });

    const [rows] = await exec(
      `
      SELECT
        p.metodo,
        COUNT(*) AS pagos_count,
        COALESCE(SUM(p.monto), 0) AS total
      FROM pagos p
      INNER JOIN facturas f ON f.id = p.factura_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY p.metodo
      ORDER BY total DESC
      `,
      params
    );

    const total = rows.reduce((acc, r) => acc + toNum(r.total, 0), 0);

    res.json({ ok: true, data: { total, rows } });
  })
);

/* =========================================================
   GET /api/reportes/por-caja
   query: desde, hasta, estado(ABIERTA/CERRADA)
   Reporte por sesión de caja con usuario y ventas
========================================================= */
router.get(
  "/por-caja",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const estado = req.query.estado ? String(req.query.estado).toUpperCase() : null;

    const where = [];
    const params = [];

    if (range.useToday) {
      where.push("cs.fecha_apertura = CURDATE()");
    } else {
      if (range.desde) {
        where.push("cs.fecha_apertura >= ?");
        params.push(range.desde);
      }
      if (range.hasta) {
        where.push("cs.fecha_apertura <= ?");
        params.push(range.hasta);
      }
    }

    if (estado === "ABIERTA" || estado === "CERRADA") {
      where.push("cs.estado = ?");
      params.push(estado);
    }

    const sql = `
      SELECT
        cs.id AS caja_sesion_id,
        cs.fecha_apertura,
        cs.estado,
        cs.monto_apertura,
        cs.fecha_cierre,
        cs.monto_cierre,
        cs.created_at,
        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.usuario AS usuario_login,
        COALESCE((
          SELECT COUNT(*) FROM facturas f WHERE f.caja_sesion_id = cs.id
        ), 0) AS facturas_count,
        COALESCE((
          SELECT SUM(f.total) FROM facturas f WHERE f.caja_sesion_id = cs.id
        ), 0) AS ventas_total
      FROM caja_sesiones cs
      INNER JOIN usuarios u ON u.id = cs.usuario_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY cs.id DESC
      LIMIT 300
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/reportes/top-productos
   query: desde, hasta, limit=10
   Usa facturas como filtro (solo lo facturado)
========================================================= */
router.get(
  "/top-productos",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));

    // Usamos facturas.created_at para rango, y amarramos por orden_id
    const where = [];
    const params = [];

    if (range.useToday) {
      where.push("DATE(f.created_at) = CURDATE()");
    } else {
      if (range.desde) {
        where.push("DATE(f.created_at) >= ?");
        params.push(range.desde);
      }
      if (range.hasta) {
        where.push("DATE(f.created_at) <= ?");
        params.push(range.hasta);
      }
    }

    const sql = `
      SELECT
        d.producto_id,
        d.producto_nombre,
        COALESCE(SUM(d.cantidad), 0) AS cantidad_total,
        COALESCE(SUM(d.total_linea), 0) AS monto_total
      FROM facturas f
      INNER JOIN orden_detalle d ON d.orden_id = f.orden_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY d.producto_id, d.producto_nombre
      ORDER BY cantidad_total DESC, monto_total DESC
      LIMIT ${limit}
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/reportes/top-categorias
   query: desde, hasta, limit=10
========================================================= */
router.get(
  "/top-categorias",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));

    const where = [];
    const params = [];

    if (range.useToday) {
      where.push("DATE(f.created_at) = CURDATE()");
    } else {
      if (range.desde) {
        where.push("DATE(f.created_at) >= ?");
        params.push(range.desde);
      }
      if (range.hasta) {
        where.push("DATE(f.created_at) <= ?");
        params.push(range.hasta);
      }
    }

    const sql = `
      SELECT
        c.id AS categoria_id,
        c.nombre AS categoria,
        COALESCE(SUM(d.cantidad), 0) AS cantidad_total,
        COALESCE(SUM(d.total_linea), 0) AS monto_total
      FROM facturas f
      INNER JOIN orden_detalle d ON d.orden_id = f.orden_id
      INNER JOIN productos p ON p.id = d.producto_id
      INNER JOIN categorias c ON c.id = p.categoria_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY c.id, c.nombre
      ORDER BY monto_total DESC, cantidad_total DESC
      LIMIT ${limit}
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/reportes/bitacora
   query: desde, hasta, q, limit=200
   Auditoría rápida
========================================================= */
router.get(
  "/bitacora",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || "200", 10)));

    const where = [];
    const params = [];

    if (range.useToday) {
      where.push("DATE(b.created_at) = CURDATE()");
    } else {
      if (range.desde) {
        where.push("DATE(b.created_at) >= ?");
        params.push(range.desde);
      }
      if (range.hasta) {
        where.push("DATE(b.created_at) <= ?");
        params.push(range.hasta);
      }
    }

    if (q) {
      where.push("(b.accion LIKE ? OR b.entidad LIKE ? OR b.detalle LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const sql = `
      SELECT
        b.id, b.usuario_id,
        u.nombre AS usuario_nombre,
        u.usuario AS usuario_login,
        b.accion, b.entidad, b.entidad_id, b.detalle, b.ip, b.created_at
      FROM bitacora b
      LEFT JOIN usuarios u ON u.id = b.usuario_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY b.id DESC
      LIMIT ${limit}
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/reportes/mi-caja/resumen
   Para CAJERO: solo su caja activa (KPIs + métodos)
========================================================= */
router.get(
  "/mi-caja/resumen",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const rol = String(req.user?.rol || "").toLowerCase();

    // admin/supervisor pueden pedir caja_sesion_id
    let cajaSesionId = null;

    if (rol === "cajero") {
      cajaSesionId = await getCajaActiva(req.user?.id);
      if (!cajaSesionId) {
        return res.status(409).json({
          ok: false,
          code: "CAJA_CERRADA",
          message: "No hay caja abierta.",
        });
      }
    } else {
      if (req.query.caja_sesion_id && isInt(req.query.caja_sesion_id)) {
        cajaSesionId = Number(req.query.caja_sesion_id);
      } else {
        return res.status(400).json({
          ok: false,
          message: "Debes enviar caja_sesion_id (admin/supervisor) o ser cajero con caja abierta.",
        });
      }
    }

    const [[kpis]] = await exec(
      `
      SELECT
        COUNT(*) AS facturas_count,
        COALESCE(SUM(f.subtotal), 0) AS subtotal_total,
        COALESCE(SUM(f.descuento), 0) AS descuento_total,
        COALESCE(SUM(f.impuesto), 0) AS impuesto_total,
        COALESCE(SUM(f.total), 0) AS ventas_total,
        COALESCE(AVG(NULLIF(f.total,0)), 0) AS ticket_promedio
      FROM facturas f
      WHERE f.caja_sesion_id = ?
      `,
      [Number(cajaSesionId)]
    );

    const [metodos] = await exec(
      `
      SELECT p.metodo, COALESCE(SUM(p.monto), 0) AS total, COUNT(*) AS pagos_count
      FROM pagos p
      INNER JOIN facturas f ON f.id = p.factura_id
      WHERE f.caja_sesion_id = ?
      GROUP BY p.metodo
      ORDER BY total DESC
      `,
      [Number(cajaSesionId)]
    );

    res.json({ ok: true, data: { caja_sesion_id: cajaSesionId, kpis, metodos } });
  })
);

export default router;
