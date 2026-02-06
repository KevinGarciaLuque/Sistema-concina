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

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* =========================
   Middlewares compatibles
========================= */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware roles en middleware/roles.js");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

function getIO(req) {
  try { return req.app.get("io") || null; } catch { return null; }
}

function emitCatalogo(req, extra = {}) {
  const io = getIO(req);
  if (!io) return;
  io.emit("catalogo:update", { entity: "modificadores", ts: Date.now(), ...extra });
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

const toBoolInt = (v, def = null) => {
  if (v === 0 || v === 1) return Number(v);
  if (v === "0" || v === "1") return Number(v);
  return def;
};

/* =========================================================
   GET /api/modificadores
   query: activo=1|0
   (cajero/cocina pueden leer para POS/KDS)
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const activo = toBoolInt(req.query.activo, null);

    const where = [];
    const params = [];

    if (activo !== null) {
      where.push("m.activo = ?");
      params.push(activo);
    }

    const [rows] = await exec(
      `
      SELECT
        m.id, m.nombre, m.requerido, m.multiple, m.activo, m.created_at,
        (SELECT COUNT(*) FROM modificador_opciones mo WHERE mo.modificador_id = m.id) AS opciones_count
      FROM modificadores m
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY m.nombre ASC
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/modificadores/:id
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `SELECT id, nombre, requerido, multiple, activo, created_at
       FROM modificadores
       WHERE id = ?`,
      [Number(id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Modificador no encontrado." });
    res.json({ ok: true, data: rows[0] });
  })
);

/* =========================================================
   POST /api/modificadores
   body: { nombre, requerido, multiple, activo }
   admin/supervisor
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const nombre = String(req.body?.nombre || "").trim();
    const requerido = toBoolInt(req.body?.requerido, 0);
    const multiple = toBoolInt(req.body?.multiple, 0);
    const activo = toBoolInt(req.body?.activo, 1);

    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    try {
      const [r] = await exec(
        `INSERT INTO modificadores (nombre, requerido, multiple, activo)
         VALUES (?, ?, ?, ?)`,
        [nombre, requerido, multiple, activo]
      );

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "modificadores",
        entidad_id: r.insertId,
        detalle: `Modificador creado: ${nombre}`,
      });

      emitCatalogo(req, { action: "created", id: r.insertId });

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese modificador ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PUT /api/modificadores/:id
   body: { nombre, requerido, multiple, activo }
   admin/supervisor
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = String(req.body?.nombre || "").trim();
    const requerido = toBoolInt(req.body?.requerido, null);
    const multiple = toBoolInt(req.body?.multiple, null);
    const activo = toBoolInt(req.body?.activo, null);

    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [ex] = await exec(`SELECT id FROM modificadores WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Modificador no encontrado." });

    const sets = ["nombre=?"];
    const params = [nombre];

    if (requerido !== null) { sets.push("requerido=?"); params.push(requerido); }
    if (multiple !== null) { sets.push("multiple=?"); params.push(multiple); }
    if (activo !== null) { sets.push("activo=?"); params.push(activo); }

    params.push(Number(id));

    try {
      await exec(`UPDATE modificadores SET ${sets.join(", ")} WHERE id=?`, params);

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "modificadores",
        entidad_id: Number(id),
        detalle: `Modificador actualizado: ${nombre}`,
      });

      emitCatalogo(req, { action: "updated", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese nombre ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PATCH /api/modificadores/:id/activo
   body: { activo: 1|0 }
========================================================= */
router.patch(
  "/:id/activo",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = toBoolInt(req.body?.activo, null);
    if (activo === null) return res.status(400).json({ ok: false, message: "activo debe ser 0 o 1." });

    const [r] = await exec(`UPDATE modificadores SET activo=? WHERE id=?`, [activo, Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Modificador no encontrado." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "modificadores",
      entidad_id: Number(id),
      detalle: `Modificador ${activo ? "ACTIVADO" : "DESACTIVADO"}`,
    });

    emitCatalogo(req, { action: "toggle", id: Number(id), activo });

    res.json({ ok: true });
  })
);

/* =========================================================
   DELETE /api/modificadores/:id
   admin
   (bloquea si está en uso por FK)
========================================================= */
router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    try {
      const [r] = await exec(`DELETE FROM modificadores WHERE id=?`, [Number(id)]);
      if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Modificador no encontrado." });

      await bitacoraSafe(req, {
        accion: "ELIMINAR",
        entidad: "modificadores",
        entidad_id: Number(id),
        detalle: "Modificador eliminado",
      });

      emitCatalogo(req, { action: "deleted", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("foreign key")) {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: el modificador está en uso (productos u órdenes).",
        });
      }
      throw e;
    }
  })
);

/* =========================================================
   OPCIONES DEL MODIFICADOR
   Tabla: modificador_opciones (id, modificador_id, nombre, precio_extra, activo, orden)
========================================================= */

/* GET /api/modificadores/:id/opciones?activo=1|0 */
router.get(
  "/:id/opciones",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = toBoolInt(req.query.activo, null);

    const where = ["mo.modificador_id = ?"];
    const params = [Number(id)];

    if (activo !== null) {
      where.push("mo.activo = ?");
      params.push(activo);
    }

    const [rows] = await exec(
      `
      SELECT mo.id, mo.modificador_id, mo.nombre, mo.precio_extra, mo.activo, mo.orden, mo.created_at
      FROM modificador_opciones mo
      WHERE ${where.join(" AND ")}
      ORDER BY mo.orden ASC, mo.nombre ASC
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* POST /api/modificadores/:id/opciones */
router.post(
  "/:id/opciones",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = String(req.body?.nombre || "").trim();
    const precio_extra = Number(req.body?.precio_extra ?? 0);
    const activo = toBoolInt(req.body?.activo, 1);
    const orden = Number.isFinite(Number(req.body?.orden)) ? Number(req.body.orden) : 0;

    if (!nombre || nombre.length < 1) {
      return res.status(400).json({ ok: false, message: "Nombre de opción inválido." });
    }
    if (!Number.isFinite(precio_extra) || precio_extra < 0) {
      return res.status(400).json({ ok: false, message: "precio_extra inválido." });
    }

    const [m] = await exec(`SELECT id FROM modificadores WHERE id=?`, [Number(id)]);
    if (!m.length) return res.status(404).json({ ok: false, message: "Modificador no encontrado." });

    const [r] = await exec(
      `INSERT INTO modificador_opciones (modificador_id, nombre, precio_extra, activo, orden)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(id), nombre, precio_extra, activo, orden]
    );

    await bitacoraSafe(req, {
      accion: "CREAR",
      entidad: "modificador_opciones",
      entidad_id: r.insertId,
      detalle: `Opción creada: ${nombre}`,
    });

    emitCatalogo(req, { action: "option_created", id: r.insertId, modificador_id: Number(id) });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/* PUT /api/modificadores/:id/opciones/:opcionId */
router.put(
  "/:id/opciones/:opcionId",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id, opcionId } = req.params;
    if (!isInt(id) || !isInt(opcionId)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = String(req.body?.nombre || "").trim();
    const precio_extra = Number(req.body?.precio_extra ?? 0);
    const activo = toBoolInt(req.body?.activo, null);
    const orden = Number.isFinite(Number(req.body?.orden)) ? Number(req.body.orden) : null;

    if (!nombre) return res.status(400).json({ ok: false, message: "Nombre inválido." });
    if (!Number.isFinite(precio_extra) || precio_extra < 0) {
      return res.status(400).json({ ok: false, message: "precio_extra inválido." });
    }

    const [ex] = await exec(
      `SELECT id FROM modificador_opciones WHERE id=? AND modificador_id=?`,
      [Number(opcionId), Number(id)]
    );
    if (!ex.length) return res.status(404).json({ ok: false, message: "Opción no encontrada." });

    const sets = ["nombre=?", "precio_extra=?"];
    const params = [nombre, precio_extra];

    if (activo !== null) { sets.push("activo=?"); params.push(activo); }
    if (orden !== null) { sets.push("orden=?"); params.push(orden); }

    params.push(Number(opcionId), Number(id));

    await exec(
      `UPDATE modificador_opciones
       SET ${sets.join(", ")}
       WHERE id=? AND modificador_id=?`,
      params
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "modificador_opciones",
      entidad_id: Number(opcionId),
      detalle: `Opción actualizada: ${nombre}`,
    });

    emitCatalogo(req, { action: "option_updated", id: Number(opcionId), modificador_id: Number(id) });

    res.json({ ok: true });
  })
);

/* PATCH /api/modificadores/:id/opciones/:opcionId/activo */
router.patch(
  "/:id/opciones/:opcionId/activo",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id, opcionId } = req.params;
    if (!isInt(id) || !isInt(opcionId)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = toBoolInt(req.body?.activo, null);
    if (activo === null) return res.status(400).json({ ok: false, message: "activo debe ser 0 o 1." });

    const [r] = await exec(
      `UPDATE modificador_opciones SET activo=? WHERE id=? AND modificador_id=?`,
      [activo, Number(opcionId), Number(id)]
    );
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Opción no encontrada." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "modificador_opciones",
      entidad_id: Number(opcionId),
      detalle: `Opción ${activo ? "ACTIVADA" : "DESACTIVADA"}`,
    });

    emitCatalogo(req, { action: "option_toggle", id: Number(opcionId), modificador_id: Number(id), activo });

    res.json({ ok: true });
  })
);

/* DELETE /api/modificadores/:id/opciones/:opcionId */
router.delete(
  "/:id/opciones/:opcionId",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id, opcionId } = req.params;
    if (!isInt(id) || !isInt(opcionId)) return res.status(400).json({ ok: false, message: "ID inválido." });

    try {
      const [r] = await exec(
        `DELETE FROM modificador_opciones WHERE id=? AND modificador_id=?`,
        [Number(opcionId), Number(id)]
      );
      if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Opción no encontrada." });

      await bitacoraSafe(req, {
        accion: "ELIMINAR",
        entidad: "modificador_opciones",
        entidad_id: Number(opcionId),
        detalle: "Opción eliminada",
      });

      emitCatalogo(req, { action: "option_deleted", id: Number(opcionId), modificador_id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("foreign key")) {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: la opción está usada en órdenes.",
        });
      }
      throw e;
    }
  })
);

/* =========================================================
   EXTRA PRO (para POS):
   GET /api/modificadores/por-producto/:productoId
   Devuelve modificadores asignados + opciones activas
========================================================= */
router.get(
  "/por-producto/:productoId",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { productoId } = req.params;
    if (!isInt(productoId)) return res.status(400).json({ ok: false, message: "productoId inválido." });

    const [mods] = await exec(
      `
      SELECT m.id, m.nombre, m.requerido, m.multiple
      FROM producto_modificadores pm
      INNER JOIN modificadores m ON m.id = pm.modificador_id
      WHERE pm.producto_id = ? AND m.activo = 1
      ORDER BY m.nombre ASC
      `,
      [Number(productoId)]
    );

    const modIds = mods.map((m) => m.id);
    let opcionesByMod = {};

    if (modIds.length) {
      const [ops] = await exec(
        `
        SELECT id, modificador_id, nombre, precio_extra, orden
        FROM modificador_opciones
        WHERE activo = 1 AND modificador_id IN (${modIds.map(() => "?").join(",")})
        ORDER BY modificador_id ASC, orden ASC, nombre ASC
        `,
        modIds
      );

      for (const op of ops) {
        if (!opcionesByMod[op.modificador_id]) opcionesByMod[op.modificador_id] = [];
        opcionesByMod[op.modificador_id].push(op);
      }
    }

    const data = mods.map((m) => ({ ...m, opciones: opcionesByMod[m.id] || [] }));
    res.json({ ok: true, data });
  })
);

export default router;
