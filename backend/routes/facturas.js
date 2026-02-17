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

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   Helpers
========================= */
function getDateRange(query) {
  const desde = query.desde ? String(query.desde) : null;
  const hasta = query.hasta ? String(query.hasta) : null;
  if (!desde && !hasta) return { useToday: true, desde: null, hasta: null };
  return { useToday: false, desde, hasta: hasta || desde };
}

/* =========================================================
   GET /api/facturas
   query: desde, hasta, q, caja_sesion_id, limit, offset
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const range = getDateRange(req.query);
    const q = req.query.q ? String(req.query.q).trim() : null;

    const limit = Math.min(300, Math.max(1, parseInt(req.query.limit || "100", 10)));
    const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

    const cajaSesionId =
      req.query.caja_sesion_id !== undefined && req.query.caja_sesion_id !== ""
        ? Number(req.query.caja_sesion_id)
        : null;

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

    if (Number.isFinite(cajaSesionId)) {
      where.push("f.caja_sesion_id = ?");
      params.push(cajaSesionId);
    }

    if (q) {
      where.push(`
        (
          f.numero_factura LIKE ?
          OR f.cliente_nombre LIKE ?
          OR f.cliente_rtn LIKE ?
          OR CAST(f.id AS CHAR) LIKE ?
        )
      `);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Método de pago: viene de tabla pagos (si existe)
    // - si tienes pagos con factura_id: trae "EFECTIVO", "TARJETA", etc.
    const sql = `
      SELECT
        f.id,
        f.numero_factura,
        f.es_copia,
        f.cliente_nombre,
        f.cliente_rtn,
        f.cliente_direccion,
        f.subtotal,
        f.descuento,
        f.impuesto,
        f.total,
        f.orden_id,
        f.caja_sesion_id,
        f.created_at,
        (
          SELECT GROUP_CONCAT(DISTINCT p.metodo ORDER BY p.metodo SEPARATOR ", ")
          FROM pagos p
          WHERE p.factura_id = f.id
        ) AS metodo_pago
      FROM facturas f
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY f.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/facturas/:id
   Detalle factura + items (orden_detalle)
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "ID inválido" });

    const [[f]] = await exec(
      `
      SELECT
        f.id,
        f.numero_factura,
        f.es_copia,
        f.cliente_nombre,
        f.cliente_rtn,
        f.cliente_direccion,
        f.subtotal,
        f.descuento,
        f.impuesto,
        f.total,
        f.orden_id,
        f.caja_sesion_id,
        f.created_at,
        (
          SELECT GROUP_CONCAT(DISTINCT p.metodo ORDER BY p.metodo SEPARATOR ", ")
          FROM pagos p
          WHERE p.factura_id = f.id
        ) AS metodo_pago
      FROM facturas f
      WHERE f.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!f) return res.status(404).json({ ok: false, message: "Factura no encontrada" });

    let items = [];
    if (f.orden_id) {
      try {
        const [det] = await exec(
          `
          SELECT
            d.id,
            d.producto_id,
            d.producto_nombre,
            d.cantidad,
            d.precio_unitario,
            d.total_linea,
            d.notas
          FROM orden_detalle d
          WHERE d.orden_id = ?
          ORDER BY d.id ASC
          `,
          [Number(f.orden_id)]
        );
        items = Array.isArray(det) ? det : [];
      } catch {
        items = [];
      }
    }

    res.json({ ok: true, data: { ...f, items } });
  })
);

export default router;
