import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* ===== DB pool compatible ===== */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* ===== Middlewares compatibles ===== */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;
if (!requireAuth) throw new Error("No se encontró middleware auth");
if (!allowRoles) throw new Error("No se encontró middleware roles");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

function getIO(req) {
  try { return req.app.get("io") || null; } catch { return null; }
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
   GET /api/roles
   Roles disponibles
   admin/supervisor (y si quieres, todos autenticados)
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      `SELECT id, nombre, created_at
       FROM roles
       ORDER BY id ASC`
    );
    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   POST /api/roles
   body: { nombre }
   admin
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const nombre = String(req.body?.nombre || "").trim().toLowerCase();
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de rol inválido." });
    }

    try {
      const [r] = await exec(`INSERT INTO roles (nombre) VALUES (?)`, [nombre]);

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "roles",
        entidad_id: r.insertId,
        detalle: `Rol creado: ${nombre}`,
      });

      const io = getIO(req);
      if (io) io.to("admin").emit("roles:update", { action: "created", id: r.insertId });

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese rol ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PUT /api/roles/:id
   body: { nombre }
   admin
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = String(req.body?.nombre || "").trim().toLowerCase();
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de rol inválido." });
    }

    const [ex] = await exec(`SELECT id FROM roles WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Rol no encontrado." });

    try {
      await exec(`UPDATE roles SET nombre=? WHERE id=?`, [nombre, Number(id)]);

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "roles",
        entidad_id: Number(id),
        detalle: `Rol actualizado: ${nombre}`,
      });

      const io = getIO(req);
      if (io) io.to("admin").emit("roles:update", { action: "updated", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese rol ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   DELETE /api/roles/:id
   admin
   (si está en uso, MySQL lo bloqueará por FK)
========================================================= */
router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    try {
      const [r] = await exec(`DELETE FROM roles WHERE id=?`, [Number(id)]);
      if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Rol no encontrado." });

      await bitacoraSafe(req, {
        accion: "ELIMINAR",
        entidad: "roles",
        entidad_id: Number(id),
        detalle: "Rol eliminado",
      });

      const io = getIO(req);
      if (io) io.to("admin").emit("roles:update", { action: "deleted", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      // FK RESTRICT: usuarios.rol_id
      if (String(e?.message || "").toLowerCase().includes("foreign key")) {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: el rol está asignado a usuarios.",
        });
      }
      throw e;
    }
  })
);

export default router;
