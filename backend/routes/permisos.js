//backend/routes/permisos.js
import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");
const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

function getIO(req) {
  try { return req.app.get("io") || null; } catch { return null; }
}

router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      `SELECT id, clave, modulo, descripcion, created_at
       FROM permisos
       ORDER BY modulo ASC, clave ASC`
    );
    res.json({ ok: true, data: rows });
  })
);

router.post(
  "/",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const clave = String(req.body?.clave || "").trim().toUpperCase();
    const modulo = String(req.body?.modulo || "").trim().toUpperCase();
    const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim().slice(0, 120) : null;

    if (!clave || clave.length < 5) return res.status(400).json({ ok: false, message: "clave inválida." });
    if (!modulo || modulo.length < 2) return res.status(400).json({ ok: false, message: "modulo inválido." });

    try {
      const [r] = await exec(
        `INSERT INTO permisos (clave, modulo, descripcion) VALUES (?, ?, ?)`,
        [clave, modulo, descripcion]
      );

      const io = getIO(req);
      if (io) io.to("admin").emit("permisos:update", { action: "created", id: r.insertId });

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese permiso ya existe (clave duplicada)." });
      }
      throw e;
    }
  })
);

router.put(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const clave = String(req.body?.clave || "").trim().toUpperCase();
    const modulo = String(req.body?.modulo || "").trim().toUpperCase();
    const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim().slice(0, 120) : null;

    if (!clave || clave.length < 5) return res.status(400).json({ ok: false, message: "clave inválida." });
    if (!modulo || modulo.length < 2) return res.status(400).json({ ok: false, message: "modulo inválido." });

    const [ex] = await exec(`SELECT id FROM permisos WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Permiso no encontrado." });

    try {
      await exec(`UPDATE permisos SET clave=?, modulo=?, descripcion=? WHERE id=?`, [clave, modulo, descripcion, Number(id)]);

      const io = getIO(req);
      if (io) io.to("admin").emit("permisos:update", { action: "updated", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Esa clave ya existe." });
      }
      throw e;
    }
  })
);

router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [r] = await exec(`DELETE FROM permisos WHERE id=?`, [Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Permiso no encontrado." });

    const io = getIO(req);
    if (io) io.to("admin").emit("permisos:update", { action: "deleted", id: Number(id) });

    res.json({ ok: true });
  })
);

export default router;
