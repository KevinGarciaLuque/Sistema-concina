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


/* =========================================================
   GET /api/facturas/:id/recibo
   TODO lo necesario para imprimir ticket 80mm:
   - factura
   - pagos
   - orden
   - items
   - opciones/modificadores por item
========================================================= */
router.get(
  "/:id/recibo",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "ID inválido" });

    // 1) Factura + datos de orden (para encabezado del ticket)
    const [[row]] = await exec(
      `
      SELECT
        f.*,
        o.codigo        AS orden_codigo,
        o.tipo          AS orden_tipo,
        o.mesa          AS orden_mesa,
        o.created_at    AS orden_created_at,
        o.notas         AS orden_notas
      FROM facturas f
      LEFT JOIN ordenes o ON o.id = f.orden_id
      WHERE f.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!row) return res.status(404).json({ ok: false, message: "Factura no encontrada" });

    // 2) CAI (para el ticket fiscal)
    let cai = null;
    if (row.cai_id) {
      const [[caiRow]] = await exec(
        `
        SELECT
          id,
          cai_codigo,
          rango_desde,
          rango_hasta,
          fecha_limite,
          establecimiento,
          punto_emision,
          tipo_documento
        FROM cai
        WHERE id = ?
        LIMIT 1
        `,
        [Number(row.cai_id)]
      );
      if (caiRow) cai = caiRow;
    }

    // 3) Pagos (para mostrar método(s) y montos)
    const [pagos] = await exec(
      `
      SELECT
        id,
        metodo,
        monto,
        referencia,
        efectivo_recibido,
        cambio,
        created_at
      FROM pagos
      WHERE factura_id = ?
      ORDER BY id ASC
      `,
      [id]
    );

    // 3) Items de la orden
    let items = [];
    if (row.orden_id) {
      const [det] = await exec(
        `
        SELECT
          d.id,
          d.producto_id,
          d.producto_nombre,
          d.cantidad,
          d.precio_unitario,
          d.total_linea,
          d.notas,
          d.tasa_impuesto
        FROM orden_detalle d
        WHERE d.orden_id = ?
        ORDER BY d.id ASC
        `,
        [Number(row.orden_id)]
      );
      items = Array.isArray(det) ? det : [];
    }

    // 4) Opciones/modificadores por item (si existen)
    let opciones = [];
    if (items.length) {
      const ids = items.map((it) => it.id);

      const [ops] = await exec(
        `
        SELECT
          odo.id,
          odo.orden_detalle_id,
          odo.modificador_id,
          m.nombre AS modificador_nombre,
          odo.opcion_nombre,
          odo.precio_extra
        FROM orden_detalle_opciones odo
        LEFT JOIN modificadores m ON m.id = odo.modificador_id
        WHERE odo.orden_detalle_id IN (${ids.map(() => "?").join(",")})
        ORDER BY odo.orden_detalle_id ASC, odo.id ASC
        `,
        ids
      );

      opciones = Array.isArray(ops) ? ops : [];
    }

    // 5) Adjuntar opciones a cada item
    const mapOpc = new Map();
    for (const o of opciones) {
      const k = String(o.orden_detalle_id);
      if (!mapOpc.has(k)) mapOpc.set(k, []);
      mapOpc.get(k).push({
        modificador: o.modificador_nombre || null,
        opcion: o.opcion_nombre || "",
        precio_extra: Number(o.precio_extra || 0),
      });
    }

    const itemsFull = items.map((it) => ({
      ...it,
      cantidad: Number(it.cantidad || 0),
      precio_unitario: Number(it.precio_unitario || 0),
      total_linea: Number(it.total_linea || 0),
      tasa_impuesto: Number(it.tasa_impuesto || 15),
      opciones: mapOpc.get(String(it.id)) || [],
    }));

    // 6) Calcular ISV separado por tasa (15% y 18%)
    let subtotalGravado15 = 0;
    let subtotalGravado18 = 0;

    itemsFull.forEach((it) => {
      const tasa = Number(it.tasa_impuesto || 15);
      // El total_linea incluye ISV, necesitamos extraer la base
      // Si tasa es 15%: base = total / 1.15, isv = base * 0.15
      // Si tasa es 18%: base = total / 1.18, isv = base * 0.18
      const divisor = 1 + tasa / 100;
      const baseNeta = Number(it.total_linea) / divisor;

      if (tasa === 18) {
        subtotalGravado18 += baseNeta;
      } else {
        subtotalGravado15 += baseNeta;
      }
    });

    const isv15 = Math.round(subtotalGravado15 * 0.15 * 100) / 100;
    const isv18 = Math.round(subtotalGravado18 * 0.18 * 100) / 100;
    const totalISV = isv15 + isv18;

    // 7) Respuesta final (lo que el ticket 80mm necesita)
    res.json({
      ok: true,
      data: {
        factura: {
          id: row.id,
          numero_factura: row.numero_factura,
          es_copia: row.es_copia,
          created_at: row.created_at,

          cliente_nombre: row.cliente_nombre,
          cliente_rtn: row.cliente_rtn,
          cliente_direccion: row.cliente_direccion,
          cliente_telefono: row.cliente_telefono,

          subtotal: Number(row.subtotal || 0),
          descuento: Number(row.descuento || 0),
          impuesto: Number(row.impuesto || 0),
          total: Number(row.total || 0),

          // Desglose de impuestos por tasa
          subtotal_gravado_15: Math.round(subtotalGravado15 * 100) / 100,
          subtotal_gravado_18: Math.round(subtotalGravado18 * 100) / 100,
          isv_15: isv15,
          isv_18: isv18,
          total_isv: totalISV,

          orden_id: row.orden_id,
          caja_sesion_id: row.caja_sesion_id,

          orden_codigo: row.orden_codigo,
          orden_tipo: row.orden_tipo,
          orden_mesa: row.orden_mesa,
          orden_created_at: row.orden_created_at,
          orden_notas: row.orden_notas,
        },
        user: null, // Usuario no disponible desde tabla facturas
        cai: cai || null,
        esCopia: Boolean(row.es_copia),
        pagos: (Array.isArray(pagos) ? pagos : []).map((p) => ({
          ...p,
          monto: Number(p.monto || 0),
          efectivo_recibido: p.efectivo_recibido == null ? null : Number(p.efectivo_recibido),
          cambio: p.cambio == null ? null : Number(p.cambio),
        })),
        items: itemsFull,
      },
    });
  })
);

export default router;
