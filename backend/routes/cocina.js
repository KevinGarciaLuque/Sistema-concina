import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

// ===== pool compatible (default o named) =====
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

// ===== middlewares compatibles =====
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware de auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware de roles en middleware/roles.js");

// ===== helpers =====
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

const ESTADOS_KDS = ["NUEVA", "EN_PREPARACION", "LISTA"];
const ESTADOS_VALIDOS = ["NUEVA", "EN_PREPARACION", "LISTA", "ENTREGADA", "ANULADA"];

// Reglas cocina (KDS)
const TRANSICIONES_KDS = {
  NUEVA: ["EN_PREPARACION"],
  EN_PREPARACION: ["LISTA"],
  LISTA: [], // entregada lo hace caja/POS normalmente
};

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

async function emitirBadges(req) {
  const io = getIO(req);
  if (!io) return;

  const [[hoy]] = await exec(
    `SELECT COUNT(*) AS ordenes_hoy
     FROM ordenes
     WHERE fecha = CURDATE() AND estado <> 'ANULADA'`
  );

  const [[cocina]] = await exec(
    `SELECT COUNT(*) AS en_cocina
     FROM ordenes
     WHERE fecha = CURDATE() AND estado = 'EN_PREPARACION'`
  );

  io.emit("badge:update", {
    ordenes: Number(hoy?.ordenes_hoy || 0),
    cocina: Number(cocina?.en_cocina || 0),
  });
}

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : xf)?.split(",")[0]?.trim() || req.ip || null;
}

// Bitácora (no tumba request si falla)
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

async function cargarDetalleOrdenes(orderIds) {
  if (!orderIds.length) return { detalleByOrden: new Map() };

  const [det] = await exec(
    `SELECT id, orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, created_at
     FROM orden_detalle
     WHERE orden_id IN (${orderIds.map(() => "?").join(",")})
     ORDER BY orden_id ASC, id ASC`,
    orderIds
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

  const detalleByOrden = new Map();
  for (const d of det) {
    const oid = Number(d.orden_id);
    if (!detalleByOrden.has(oid)) detalleByOrden.set(oid, []);
    detalleByOrden.get(oid).push({
      ...d,
      opciones: opsByDet.get(Number(d.id)) || [],
    });
  }

  return { detalleByOrden };
}

/* =========================================================
   GET /api/cocina/board
   Órdenes de HOY para pantalla KDS
   (NUEVA / EN_PREPARACION / LISTA)
========================================================= */
router.get(
  "/board",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina"),
  asyncHandler(async (req, res) => {
    const [ordenes] = await exec(
      `SELECT
         o.id, o.codigo, o.tipo, o.mesa, o.cliente_nombre, o.estado,
         o.notas, o.subtotal, o.descuento, o.impuesto, o.total,
         o.created_at, o.updated_at
       FROM ordenes o
       WHERE o.fecha = CURDATE()
         AND o.estado IN ('NUEVA','EN_PREPARACION','LISTA')
       ORDER BY
         FIELD(o.estado, 'NUEVA','EN_PREPARACION','LISTA'),
         o.created_at ASC`
    );

    const ids = ordenes.map((o) => Number(o.id));
    const { detalleByOrden } = await cargarDetalleOrdenes(ids);

    const data = ordenes.map((o) => ({
      ...o,
      detalle: detalleByOrden.get(Number(o.id)) || [],
    }));

    const resumen = {
      nuevas: data.filter((x) => x.estado === "NUEVA").length,
      en_preparacion: data.filter((x) => x.estado === "EN_PREPARACION").length,
      listas: data.filter((x) => x.estado === "LISTA").length,
    };

    res.json({ ok: true, data: { resumen, ordenes: data } });
  })
);

/* =========================================================
   GET /api/cocina/ordenes?fecha=YYYY-MM-DD&estados=NUEVA,EN_PREPARACION
========================================================= */
router.get(
  "/ordenes",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina"),
  asyncHandler(async (req, res) => {
    const fecha = req.query.fecha ? String(req.query.fecha) : null;
    const estadosRaw = req.query.estados ? String(req.query.estados) : null;

    const estados = (estadosRaw ? estadosRaw.split(",") : ESTADOS_KDS)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => ESTADOS_VALIDOS.includes(s));

    if (!estados.length) {
      return res.status(400).json({ ok: false, message: "estados inválidos." });
    }

    const where = [];
    const params = [];

    if (fecha) {
      where.push("o.fecha = ?");
      params.push(fecha);
    } else {
      where.push("o.fecha = CURDATE()");
    }

    where.push(`o.estado IN (${estados.map(() => "?").join(",")})`);
    params.push(...estados);

    const [ordenes] = await exec(
      `SELECT
         o.id, o.codigo, o.tipo, o.mesa, o.cliente_nombre, o.estado,
         o.notas, o.subtotal, o.descuento, o.impuesto, o.total,
         o.created_at, o.updated_at
       FROM ordenes o
       WHERE ${where.join(" AND ")}
       ORDER BY o.created_at ASC`,
      params
    );

    const ids = ordenes.map((o) => Number(o.id));
    const { detalleByOrden } = await cargarDetalleOrdenes(ids);

    res.json({
      ok: true,
      data: ordenes.map((o) => ({
        ...o,
        detalle: detalleByOrden.get(Number(o.id)) || [],
      })),
    });
  })
);

/* =========================================================
   GET /api/cocina/ordenes/:id  (detalle completo)
========================================================= */
router.get(
  "/ordenes/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [oRows] = await exec(
      `SELECT
         o.id, o.fecha, o.numero_dia, o.codigo, o.cliente_nombre, o.tipo, o.mesa, o.estado,
         o.notas, o.subtotal, o.descuento, o.impuesto, o.total,
         o.creado_por, o.asignado_cocina_por,
         o.created_at, o.updated_at
       FROM ordenes o
       WHERE o.id = ?`,
      [Number(id)]
    );

    if (!oRows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });

    const [det] = await exec(
      `SELECT id, orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea, created_at
       FROM orden_detalle
       WHERE orden_id = ?
       ORDER BY id ASC`,
      [Number(id)]
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

    const [hist] = await exec(
      `SELECT h.id, h.estado, h.cambiado_por, h.comentario, h.created_at
       FROM orden_estados_historial h
       WHERE h.orden_id = ?
       ORDER BY h.id ASC`,
      [Number(id)]
    );

    res.json({ ok: true, data: { orden: oRows[0], detalle, historial: hist } });
  })
);

/* =========================================================
   PATCH /api/cocina/ordenes/:id/estado
   body: { estado, comentario? }
   Cocina: NUEVA->EN_PREPARACION->LISTA
   Admin/Supervisor: puede forzar cualquier estado válido.
========================================================= */
router.patch(
  "/ordenes/:id/estado",
  requireAuth,
  allowRoles("admin", "supervisor", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estado, comentario = null, force = 0 } = req.body || {};

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nextEstado = String(estado || "").toUpperCase();
    if (!ESTADOS_VALIDOS.includes(nextEstado)) {
      return res.status(400).json({ ok: false, message: "Estado inválido." });
    }

    const [rows] = await exec(
      `SELECT id, codigo, estado, asignado_cocina_por
       FROM ordenes
       WHERE id = ?`,
      [Number(id)]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: "Orden no encontrada." });

    const orden = rows[0];
    const current = String(orden.estado).toUpperCase();

    const rol = String(req.user?.rol || "").toLowerCase();
    const isAdmin = rol === "admin" || rol === "supervisor";

    // Cocina no debería marcar ENTREGADA ni ANULADA (a menos que admin/supervisor fuerce)
    if (!isAdmin && (nextEstado === "ENTREGADA" || nextEstado === "ANULADA")) {
      return res.status(403).json({
        ok: false,
        message: "Cocina no puede marcar ENTREGADA/ANULADA. Eso se hace desde POS/Caja.",
      });
    }

    // Reglas transición cocina
    if (!isAdmin && Number(force) !== 1) {
      const allowed = TRANSICIONES_KDS[current] || [];
      if (!allowed.includes(nextEstado)) {
        return res.status(409).json({
          ok: false,
          message: `Transición no permitida en cocina: ${current} → ${nextEstado}`,
        });
      }
    }

    // Si pasa a EN_PREPARACION y aún no está asignado, guardar quién lo tomó
    const setAsignado = nextEstado === "EN_PREPARACION" && !orden.asignado_cocina_por;

    await exec(
      `UPDATE ordenes
       SET estado = ? ${setAsignado ? ", asignado_cocina_por = ?" : ""}
       WHERE id = ?`,
      setAsignado
        ? [nextEstado, req.user?.id ?? null, Number(id)]
        : [nextEstado, Number(id)]
    );

    await exec(
      `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
       VALUES (?, ?, ?, ?)`,
      [Number(id), nextEstado, req.user?.id ?? null, comentario ? String(comentario).slice(0, 255) : null]
    );

    await registrarBitacoraSafe(req, {
      usuario_id: req.user?.id ?? null,
      accion: "CAMBIAR_ESTADO",
      entidad: "ordenes",
      entidad_id: Number(id),
      detalle: `KDS ${orden.codigo}: ${current} → ${nextEstado}`,
    });

    // realtime
    const io = getIO(req);
    if (io) {
      io.to("cocina").emit("orden:estado", { id: Number(id), codigo: orden.codigo, estado: nextEstado });
      io.to("caja").emit("orden:estado", { id: Number(id), codigo: orden.codigo, estado: nextEstado });
      io.emit("orden:estado", { id: Number(id), codigo: orden.codigo, estado: nextEstado });
      await emitirBadges(req);
    }

    res.json({ ok: true });
  })
);

export default router;
