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

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

function emitCaja(req, payload) {
  const io = getIO(req);
  if (!io) return;
  // room "caja" (según tu socket join)
  io.to("caja").emit("caja:update", { ts: Date.now(), ...payload });
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

function toMoney(v, def = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.round(n * 100) / 100;
}

/* =========================================================
   GET /api/caja/health
========================================================= */
router.get(
  "/health",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    res.json({ ok: true });
  })
);

/* =========================================================
   GET /api/caja/sesion-activa
   Sesión ABIERTA del usuario autenticado
========================================================= */
router.get(
  "/sesion-activa",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ ok: false, message: "Sesión no válida." });

    const [rows] = await exec(
      `
      SELECT
        cs.id, cs.usuario_id, u.nombre AS usuario_nombre, u.usuario,
        cs.fecha_apertura, cs.monto_apertura, cs.estado,
        cs.fecha_cierre, cs.monto_cierre, cs.created_at
      FROM caja_sesiones cs
      INNER JOIN usuarios u ON u.id = cs.usuario_id
      WHERE cs.usuario_id = ? AND cs.estado = 'ABIERTA'
      ORDER BY cs.id DESC
      LIMIT 1
      `,
      [Number(uid)]
    );

    res.json({ ok: true, data: rows[0] || null });
  })
);

/* =========================================================
   POST /api/caja/abrir
   body: { monto_apertura }
   - crea sesion ABIERTA para el usuario
========================================================= */
router.post(
  "/abrir",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ ok: false, message: "Sesión no válida." });

    const monto_apertura = toMoney(req.body?.monto_apertura, null);
    if (monto_apertura === null || monto_apertura < 0) {
      return res.status(400).json({ ok: false, message: "monto_apertura inválido." });
    }

    // Evitar 2 sesiones abiertas por usuario
    const [abiertas] = await exec(
      `SELECT id FROM caja_sesiones WHERE usuario_id=? AND estado='ABIERTA' LIMIT 1`,
      [Number(uid)]
    );
    if (abiertas.length) {
      return res.status(409).json({
        ok: false,
        message: "Ya tienes una caja ABIERTA.",
        sesion_id: abiertas[0].id,
      });
    }

    // Fecha apertura = hoy (date)
    const [r] = await exec(
      `INSERT INTO caja_sesiones (usuario_id, fecha_apertura, monto_apertura, estado)
       VALUES (?, CURDATE(), ?, 'ABIERTA')`,
      [Number(uid), monto_apertura]
    );

    await bitacoraSafe(req, {
      accion: "CREAR",
      entidad: "caja_sesiones",
      entidad_id: r.insertId,
      detalle: `Caja ABIERTA. Apertura: L ${monto_apertura.toFixed(2)}`,
    });

    emitCaja(req, { action: "abierta", sesion_id: r.insertId, usuario_id: uid });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/* =========================================================
   POST /api/caja/cerrar
   body: { 
     sesion_id?, 
     monto_cierre,
     detalle_cierre?: {
       efectivo: { denominaciones: {...}, subtotal },
       transferencia: number,
       tarjeta: number,
       otros: number,
       observaciones: string
     }
   }
   - si no mandas sesion_id, cierra la ABIERTA del usuario
========================================================= */
router.post(
  "/cerrar",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ ok: false, message: "Sesión no válida." });

    const monto_cierre = toMoney(req.body?.monto_cierre, null);
    if (monto_cierre === null || monto_cierre < 0) {
      return res.status(400).json({ ok: false, message: "monto_cierre inválido." });
    }

    const detalle_cierre = req.body?.detalle_cierre || null;
    const sesion_id = req.body?.sesion_id;
    let sesion;

    if (sesion_id !== undefined && sesion_id !== null && sesion_id !== "") {
      if (!isInt(sesion_id)) return res.status(400).json({ ok: false, message: "sesion_id inválido." });

      const [rows] = await exec(
        `SELECT * FROM caja_sesiones WHERE id=? LIMIT 1`,
        [Number(sesion_id)]
      );
      sesion = rows[0] || null;

      if (!sesion) return res.status(404).json({ ok: false, message: "Sesión no encontrada." });

      // Si no es admin/supervisor, solo puede cerrar su propia caja
      const rol = String(req.user?.rol || "").toLowerCase();
      const puedeCerrarOtra = rol === "admin" || rol === "supervisor";
      if (!puedeCerrarOtra && Number(sesion.usuario_id) !== Number(uid)) {
        return res.status(403).json({ ok: false, message: "No autorizado para cerrar esa caja." });
      }
    } else {
      const [rows] = await exec(
        `SELECT * FROM caja_sesiones
         WHERE usuario_id=? AND estado='ABIERTA'
         ORDER BY id DESC
         LIMIT 1`,
        [Number(uid)]
      );
      sesion = rows[0] || null;
      if (!sesion) return res.status(409).json({ ok: false, message: "No tienes caja ABIERTA." });
    }

    if (sesion.estado !== "ABIERTA") {
      return res.status(409).json({ ok: false, message: "La caja ya está CERRADA." });
    }

    // Preparar detalle para JSON
    const detalleJson = detalle_cierre ? JSON.stringify(detalle_cierre) : null;

    await exec(
      `UPDATE caja_sesiones
       SET estado='CERRADA', fecha_cierre=NOW(), monto_cierre=?, detalle_cierre=?
       WHERE id=?`,
      [monto_cierre, detalleJson, Number(sesion.id)]
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "caja_sesiones",
      entidad_id: Number(sesion.id),
      detalle: `Caja CERRADA. Cierre: L ${monto_cierre.toFixed(2)}`,
    });

    emitCaja(req, { action: "cerrada", sesion_id: Number(sesion.id), usuario_id: Number(sesion.usuario_id) });

    res.json({ ok: true });
  })
);

/* =========================================================
   GET /api/caja/sesiones
   query: from=YYYY-MM-DD, to=YYYY-MM-DD, estado=ABIERTA|CERRADA
   admin/supervisor
========================================================= */
router.get(
  "/sesiones",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { from, to, estado } = req.query;

    const where = [];
    const params = [];

    if (from) {
      where.push("cs.fecha_apertura >= ?");
      params.push(String(from));
    }
    if (to) {
      where.push("cs.fecha_apertura <= ?");
      params.push(String(to));
    }
    if (estado === "ABIERTA" || estado === "CERRADA") {
      where.push("cs.estado = ?");
      params.push(String(estado));
    }

    const [rows] = await exec(
      `
      SELECT
        cs.id, cs.usuario_id, u.nombre AS usuario_nombre, u.usuario,
        cs.fecha_apertura, cs.monto_apertura, cs.estado,
        cs.fecha_cierre, cs.monto_cierre, cs.created_at
      FROM caja_sesiones cs
      INNER JOIN usuarios u ON u.id = cs.usuario_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY cs.id DESC
      LIMIT 500
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/caja/sesiones/:id/resumen
   Resumen de facturas/pagos de esa sesión
   admin/supervisor/cajero (si es su sesión)
========================================================= */
router.get(
  "/sesiones/:id/resumen",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [sRows] = await exec(
      `SELECT cs.*, u.nombre AS usuario_nombre, u.usuario
       FROM caja_sesiones cs
       INNER JOIN usuarios u ON u.id = cs.usuario_id
       WHERE cs.id=?`,
      [Number(id)]
    );
    const sesion = sRows[0] || null;
    if (!sesion) return res.status(404).json({ ok: false, message: "Sesión no encontrada." });

    // cajero solo puede ver su sesión; admin/supervisor pueden ver todas
    const rol = String(req.user?.rol || "").toLowerCase();
    const isAdminSupervisor = rol === "admin" || rol === "supervisor";
    if (!isAdminSupervisor && Number(sesion.usuario_id) !== Number(req.user?.id)) {
      return res.status(403).json({ ok: false, message: "No autorizado." });
    }

    // facturas en esa sesión
    const [[factAgg]] = await exec(
      `
      SELECT
        COUNT(*) AS facturas_count,
        COALESCE(SUM(total), 0) AS total_facturado,
        COALESCE(SUM(subtotal), 0) AS subtotal,
        COALESCE(SUM(descuento), 0) AS descuento,
        COALESCE(SUM(impuesto), 0) AS impuesto
      FROM facturas
      WHERE caja_sesion_id = ?
      `,
      [Number(id)]
    );

    // pagos por método (pagos.factura_id -> facturas.caja_sesion_id)
    const [payRows] = await exec(
      `
      SELECT
        p.metodo,
        COALESCE(SUM(p.monto), 0) AS total_monto,
        COALESCE(SUM(p.efectivo_recibido), 0) AS total_efectivo_recibido,
        COALESCE(SUM(p.cambio), 0) AS total_cambio
      FROM pagos p
      INNER JOIN facturas f ON f.id = p.factura_id
      WHERE f.caja_sesion_id = ?
      GROUP BY p.metodo
      `,
      [Number(id)]
    );

    const pagos = {};
    for (const r of payRows) {
      pagos[r.metodo] = {
        metodo: r.metodo,
        total_monto: Number(r.total_monto || 0),
        total_efectivo_recibido: Number(r.total_efectivo_recibido || 0),
        total_cambio: Number(r.total_cambio || 0),
      };
    }

    // cálculo pro (para cuadre)
    const totalEfectivo = pagos.EFECTIVO?.total_monto || 0;
    const totalCambio = pagos.EFECTIVO?.total_cambio || 0;

    const esperadoEnCaja = Number(sesion.monto_apertura || 0) + totalEfectivo - totalCambio;
    const cierre = sesion.monto_cierre !== null ? Number(sesion.monto_cierre) : null;
    const diferencia = cierre !== null ? Math.round((cierre - esperadoEnCaja) * 100) / 100 : null;

    // Parsear detalle_cierre si existe
    let detalleCierre = null;
    if (sesion.detalle_cierre) {
      try {
        detalleCierre = typeof sesion.detalle_cierre === 'string' 
          ? JSON.parse(sesion.detalle_cierre) 
          : sesion.detalle_cierre;
      } catch {}
    }

    res.json({
      ok: true,
      data: {
        sesion: {
          id: sesion.id,
          usuario_id: sesion.usuario_id,
          usuario_nombre: sesion.usuario_nombre,
          usuario: sesion.usuario,
          fecha_apertura: sesion.fecha_apertura,
          monto_apertura: Number(sesion.monto_apertura || 0),
          estado: sesion.estado,
          fecha_cierre: sesion.fecha_cierre,
          monto_cierre: sesion.monto_cierre !== null ? Number(sesion.monto_cierre) : null,
          created_at: sesion.created_at,
          detalle_cierre: detalleCierre,
        },
        facturacion: {
          facturas_count: Number(factAgg?.facturas_count || 0),
          subtotal: Number(factAgg?.subtotal || 0),
          descuento: Number(factAgg?.descuento || 0),
          impuesto: Number(factAgg?.impuesto || 0),
          total_facturado: Number(factAgg?.total_facturado || 0),
        },
        pagos,
        cuadre: {
          esperado_en_caja: Math.round(esperadoEnCaja * 100) / 100,
          monto_cierre: cierre,
          diferencia,
        },
      },
    });
  })
);

export default router;
