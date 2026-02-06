import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* ===== Pool compatible con tu db.js ===== */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

/* ===== Middlewares compatibles ===== */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware roles en middleware/roles.js");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

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

function emitCatalogo(req) {
  try {
    const io = req.app.get("io");
    if (io) io.emit("catalogo:update", { entity: "categorias", ts: Date.now() });
  } catch {}
}

/* =========================================================
   GET /api/categorias
   Query:
   - activo=1|0 (opcional)
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { activo } = req.query;

    const where = [];
    const params = [];

    if (activo === "0" || activo === "1") {
      where.push("c.activo = ?");
      params.push(Number(activo));
    }

    const [rows] = await exec(
      `
      SELECT c.id, c.nombre, c.activo, c.orden, c.created_at
      FROM categorias c
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY c.orden ASC, c.nombre ASC
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   POST /api/categorias
   body: { nombre, orden?, activo? }
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const nombre = String(req.body?.nombre || "").trim();
    const orden = Number.isFinite(Number(req.body?.orden)) ? Number(req.body.orden) : 0;
    const activo = req.body?.activo === 0 || req.body?.activo === 1 ? Number(req.body.activo) : 1;

    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    try {
      const [r] = await exec(
        `INSERT INTO categorias (nombre, activo, orden) VALUES (?, ?, ?)`,
        [nombre, activo, orden]
      );

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "categorias",
        entidad_id: r.insertId,
        detalle: `Categoría creada: ${nombre}`,
      });

      emitCatalogo(req);

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Esa categoría ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PUT /api/categorias/:id
   body: { nombre, orden?, activo? }
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = String(req.body?.nombre || "").trim();
    const orden = Number.isFinite(Number(req.body?.orden)) ? Number(req.body.orden) : null;
    const activo =
      req.body?.activo === 0 || req.body?.activo === 1 ? Number(req.body.activo) : null;

    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [ex] = await exec(`SELECT id FROM categorias WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Categoría no encontrada." });

    const sets = ["nombre=?"];
    const params = [nombre];

    if (orden !== null) {
      sets.push("orden=?");
      params.push(orden);
    }
    if (activo !== null) {
      sets.push("activo=?");
      params.push(activo);
    }

    params.push(Number(id));

    try {
      await exec(`UPDATE categorias SET ${sets.join(", ")} WHERE id=?`, params);

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "categorias",
        entidad_id: Number(id),
        detalle: `Categoría actualizada: ${nombre}`,
      });

      emitCatalogo(req);

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
   PATCH /api/categorias/:id/activo
   body: { activo: 1|0 }
========================================================= */
router.patch(
  "/:id/activo",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = req.body?.activo;
    if (!(activo === 0 || activo === 1 || activo === "0" || activo === "1")) {
      return res.status(400).json({ ok: false, message: "activo debe ser 0 o 1." });
    }

    const [r] = await exec(`UPDATE categorias SET activo=? WHERE id=?`, [Number(activo), Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Categoría no encontrada." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "categorias",
      entidad_id: Number(id),
      detalle: `Categoría ${Number(activo) ? "ACTIVADA" : "DESACTIVADA"}`,
    });

    emitCatalogo(req);

    res.json({ ok: true });
  })
);

/* =========================================================
   PATCH /api/categorias/:id/orden
   body: { orden }
========================================================= */
router.patch(
  "/:id/orden",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const orden = Number(req.body?.orden);
    if (!Number.isFinite(orden)) {
      return res.status(400).json({ ok: false, message: "orden inválido." });
    }

    const [r] = await exec(`UPDATE categorias SET orden=? WHERE id=?`, [orden, Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Categoría no encontrada." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "categorias",
      entidad_id: Number(id),
      detalle: `Orden actualizado: ${orden}`,
    });

    emitCatalogo(req);

    res.json({ ok: true });
  })
);

/* =========================================================
   DELETE /api/categorias/:id
   (si tiene productos, MySQL lo bloqueará por FK)
========================================================= */
router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    try {
      const [r] = await exec(`DELETE FROM categorias WHERE id=?`, [Number(id)]);
      if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Categoría no encontrada." });

      await bitacoraSafe(req, {
        accion: "ELIMINAR",
        entidad: "categorias",
        entidad_id: Number(id),
        detalle: "Categoría eliminada",
      });

      emitCatalogo(req);

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("foreign key")) {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: la categoría tiene productos asociados.",
        });
      }
      throw e;
    }
  })
);

export default router;
