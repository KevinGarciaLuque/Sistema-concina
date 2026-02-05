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

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

const isInt = (v) => Number.isInteger(Number(v));

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/caja/estado
 * Retorna si el usuario tiene caja ABIERTA
 */
router.get(
  "/estado",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    const [rows] = await exec(
      `SELECT id, usuario_id, fecha_apertura, monto_apertura, estado, fecha_cierre, monto_cierre, created_at
       FROM caja_sesiones
       WHERE usuario_id = ? AND estado = 'ABIERTA'
       ORDER BY id DESC
       LIMIT 1`,
      [Number(userId)]
    );

    if (!rows.length) {
      return res.json({ ok: true, abierta: false, sesion: null });
    }

    res.json({ ok: true, abierta: true, sesion: rows[0] });
  })
);

/**
 * GET /api/caja/activa
 * Alias: sesión abierta del usuario logueado
 */
router.get(
  "/activa",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    const [rows] = await exec(
      `SELECT id, usuario_id, fecha_apertura, monto_apertura, estado, fecha_cierre, monto_cierre, created_at
       FROM caja_sesiones
       WHERE usuario_id = ? AND estado = 'ABIERTA'
       ORDER BY id DESC
       LIMIT 1`,
      [Number(userId)]
    );

    res.json({ ok: true, data: rows[0] || null });
  })
);

/**
 * POST /api/caja/abrir
 * body: { monto_apertura }
 * Roles: admin, supervisor, cajero
 */
router.post(
  "/abrir",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { monto_apertura = 0 } = req.body || {};

    const monto = Number(monto_apertura);
    if (Number.isNaN(monto) || monto < 0) {
      return res.status(400).json({ ok: false, message: "monto_apertura inválido." });
    }

    // Evitar doble caja abierta por usuario
    const [ya] = await exec(
      `SELECT id FROM caja_sesiones
       WHERE usuario_id = ? AND estado = 'ABIERTA'
       ORDER BY id DESC LIMIT 1`,
      [Number(userId)]
    );

    if (ya.length) {
      return res.status(409).json({
        ok: false,
        code: "CAJA_YA_ABIERTA",
        message: "Ya tienes una caja ABIERTA.",
        caja_sesion_id: ya[0].id,
      });
    }

    const [r] = await exec(
      `INSERT INTO caja_sesiones (usuario_id, fecha_apertura, monto_apertura, estado)
       VALUES (?, CURDATE(), ?, 'ABIERTA')`,
      [Number(userId), monto]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: userId,
      accion: "ABRIR_CAJA",
      entidad: "caja_sesiones",
      entidad_id: r.insertId,
      detalle: `Caja abierta. Monto apertura: ${monto.toFixed(2)}`,
      ip: getIp(req),
    });

    // Realtime (opcional)
    const io = getIO(req);
    if (io) {
      io.emit("caja:estado", { estado: "ABIERTA", caja_sesion_id: r.insertId, usuario_id: userId });
      io.emit("badge:update", { caja: 1 });
    }

    res.status(201).json({ ok: true, caja_sesion_id: r.insertId });
  })
);

/**
 * POST /api/caja/:id/cerrar
 * body: { monto_cierre }
 * Roles: admin, supervisor, cajero
 */
router.post(
  "/:id/cerrar",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { monto_cierre = null } = req.body || {};

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const cierre = monto_cierre === null ? null : Number(monto_cierre);
    if (cierre !== null && (Number.isNaN(cierre) || cierre < 0)) {
      return res.status(400).json({ ok: false, message: "monto_cierre inválido." });
    }

    // validar que exista y esté abierta
    const [rows] = await exec(
      `SELECT id, usuario_id, estado
       FROM caja_sesiones
       WHERE id = ?
       LIMIT 1`,
      [Number(id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Caja no encontrada." });
    if (rows[0].estado !== "ABIERTA") {
      return res.status(409).json({ ok: false, message: "La caja ya está cerrada." });
    }

    // seguridad: si es cajero, solo puede cerrar su caja
    const rol = (req.user?.rol || "").toLowerCase();
    if (rol === "cajero" && Number(rows[0].usuario_id) !== Number(userId)) {
      return res.status(403).json({ ok: false, message: "No puedes cerrar la caja de otro usuario." });
    }

    await exec(
      `UPDATE caja_sesiones
       SET estado = 'CERRADA',
           fecha_cierre = NOW(),
           monto_cierre = ?
       WHERE id = ?`,
      [cierre, Number(id)]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: userId,
      accion: "CERRAR_CAJA",
      entidad: "caja_sesiones",
      entidad_id: Number(id),
      detalle: `Caja cerrada. Monto cierre: ${cierre === null ? "NULL" : cierre.toFixed(2)}`,
      ip: getIp(req),
    });

    // Realtime (opcional)
    const io = getIO(req);
    if (io) {
      io.emit("caja:estado", { estado: "CERRADA", caja_sesion_id: Number(id), usuario_id: rows[0].usuario_id });
      io.emit("badge:update", { caja: 0 });
    }

    res.json({ ok: true });
  })
);

/**
 * GET /api/caja/:id/resumen
 * Resumen de ventas y pagos de una sesión de caja
 * Roles: admin, supervisor, cajero (cajero solo su caja)
 */
router.get(
  "/:id/resumen",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [cajaRows] = await exec(
      `SELECT id, usuario_id, fecha_apertura, monto_apertura, estado, fecha_cierre, monto_cierre, created_at
       FROM caja_sesiones
       WHERE id = ?`,
      [Number(id)]
    );

    if (!cajaRows.length) return res.status(404).json({ ok: false, message: "Caja no encontrada." });

    const caja = cajaRows[0];

    // seguridad cajero
    const rol = (req.user?.rol || "").toLowerCase();
    if (rol === "cajero" && Number(caja.usuario_id) !== Number(userId)) {
      return res.status(403).json({ ok: false, message: "No autorizado." });
    }

    const [ventasRows] = await exec(
      `SELECT
         COUNT(*) AS facturas_count,
         COALESCE(SUM(total), 0) AS ventas_total,
         COALESCE(SUM(subtotal), 0) AS subtotal_total,
         COALESCE(SUM(impuesto), 0) AS impuesto_total,
         COALESCE(SUM(descuento), 0) AS descuento_total
       FROM facturas
       WHERE caja_sesion_id = ?`,
      [Number(id)]
    );

    const ventas = ventasRows[0] || {
      facturas_count: 0,
      ventas_total: 0,
      subtotal_total: 0,
      impuesto_total: 0,
      descuento_total: 0,
    };

    const [pagosRows] = await exec(
      `SELECT p.metodo, COALESCE(SUM(p.monto), 0) AS total
       FROM pagos p
       INNER JOIN facturas f ON f.id = p.factura_id
       WHERE f.caja_sesion_id = ?
       GROUP BY p.metodo
       ORDER BY p.metodo`,
      [Number(id)]
    );

    // extra: efectivo recibido / cambio (útil para corte)
    const [cashRows] = await exec(
      `SELECT
         COALESCE(SUM(CASE WHEN p.metodo IN ('EFECTIVO','MIXTO') THEN p.efectivo_recibido ELSE 0 END), 0) AS efectivo_recibido,
         COALESCE(SUM(CASE WHEN p.metodo IN ('EFECTIVO','MIXTO') THEN p.cambio ELSE 0 END), 0) AS cambio_total
       FROM pagos p
       INNER JOIN facturas f ON f.id = p.factura_id
       WHERE f.caja_sesion_id = ?`,
      [Number(id)]
    );

    res.json({
      ok: true,
      caja,
      ventas,
      pagos: pagosRows,
      efectivo: cashRows[0] || { efectivo_recibido: 0, cambio_total: 0 },
    });
  })
);

/**
 * GET /api/caja/historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&usuario_id=&estado=
 * Roles: admin, supervisor
 */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { desde, hasta, usuario_id, estado } = req.query;

    const where = [];
    const params = [];

    if (desde) {
      where.push("cs.fecha_apertura >= ?");
      params.push(String(desde));
    }
    if (hasta) {
      where.push("cs.fecha_apertura <= ?");
      params.push(String(hasta));
    }
    if (usuario_id !== undefined && usuario_id !== "" && isInt(usuario_id)) {
      where.push("cs.usuario_id = ?");
      params.push(Number(usuario_id));
    }
    if (estado) {
      where.push("cs.estado = ?");
      params.push(String(estado).toUpperCase() === "CERRADA" ? "CERRADA" : "ABIERTA");
    }

    const sql = `
      SELECT
        cs.id,
        cs.usuario_id,
        u.nombre AS usuario_nombre,
        u.usuario AS usuario_login,
        cs.fecha_apertura,
        cs.monto_apertura,
        cs.estado,
        cs.fecha_cierre,
        cs.monto_cierre,
        cs.created_at,
        COALESCE((
          SELECT SUM(f.total) FROM facturas f WHERE f.caja_sesion_id = cs.id
        ), 0) AS ventas_total,
        COALESCE((
          SELECT COUNT(*) FROM facturas f WHERE f.caja_sesion_id = cs.id
        ), 0) AS facturas_count
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

module.exports = router;
