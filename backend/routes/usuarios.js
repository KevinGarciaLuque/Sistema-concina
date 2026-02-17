//Backend/routes/usuario.js
import express from "express";
import bcrypt from "bcryptjs";

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

function sanitizeUser(u) {
  // nunca devolvemos password_hash
  const { password_hash, ...safe } = u;
  return safe;
}

function genTempPassword(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* =========================================================
   GET /api/usuarios
   Filtros: q, rol_id, activo (1/0)
   admin/supervisor
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { q, rol_id, activo } = req.query;

    const where = [];
    const params = [];

    if (q) {
      where.push("(u.nombre LIKE ? OR u.usuario LIKE ? OR r.nombre LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (rol_id !== undefined && rol_id !== "" && isInt(rol_id)) {
      where.push("u.rol_id = ?");
      params.push(Number(rol_id));
    }

    if (activo === "0" || activo === "1") {
      where.push("u.activo = ?");
      params.push(Number(activo));
    }

    const [rows] = await exec(
      `
      SELECT
        u.id, u.rol_id, r.nombre AS rol,
        u.nombre, u.usuario, u.activo,
        u.created_at, u.updated_at
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY u.id DESC
      LIMIT 300
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/usuarios/:id
   admin/supervisor
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `
      SELECT
        u.id, u.rol_id, r.nombre AS rol,
        u.nombre, u.usuario, u.activo,
        u.created_at, u.updated_at
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?
      `,
      [Number(id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
    res.json({ ok: true, data: rows[0] });
  })
);

/* =========================================================
   POST /api/usuarios
   body: { rol_id, nombre, usuario, password }
   admin
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const rol_id = Number(req.body?.rol_id);
    const nombre = String(req.body?.nombre || "").trim();
    const usuario = String(req.body?.usuario || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!Number.isInteger(rol_id) || rol_id <= 0) {
      return res.status(400).json({ ok: false, message: "rol_id inválido." });
    }
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }
    if (!usuario || usuario.length < 3) {
      return res.status(400).json({ ok: false, message: "Usuario inválido." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ ok: false, message: "Password muy corto." });
    }

    // valida rol existe
    const [rolRows] = await exec(`SELECT id FROM roles WHERE id=?`, [rol_id]);
    if (!rolRows.length) return res.status(409).json({ ok: false, message: "El rol no existe." });

    const password_hash = await bcrypt.hash(password, 10);

    try {
      const [r] = await exec(
        `INSERT INTO usuarios (rol_id, nombre, usuario, password_hash, activo)
         VALUES (?, ?, ?, ?, 1)`,
        [rol_id, nombre, usuario, password_hash]
      );

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "usuarios",
        entidad_id: r.insertId,
        detalle: `Usuario creado: ${usuario} (${nombre})`,
      });

      const io = getIO(req);
      if (io) io.to("admin").emit("usuarios:update", { action: "created", id: r.insertId });

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese usuario ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PUT /api/usuarios/:id
   body: { rol_id, nombre, usuario }
   admin
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const rol_id = Number(req.body?.rol_id);
    const nombre = String(req.body?.nombre || "").trim();
    const usuario = String(req.body?.usuario || "").trim().toLowerCase();

    if (!Number.isInteger(rol_id) || rol_id <= 0) {
      return res.status(400).json({ ok: false, message: "rol_id inválido." });
    }
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }
    if (!usuario || usuario.length < 3) {
      return res.status(400).json({ ok: false, message: "Usuario inválido." });
    }

    const [ex] = await exec(`SELECT id FROM usuarios WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });

    // valida rol existe
    const [rolRows] = await exec(`SELECT id FROM roles WHERE id=?`, [rol_id]);
    if (!rolRows.length) return res.status(409).json({ ok: false, message: "El rol no existe." });

    try {
      await exec(
        `UPDATE usuarios
         SET rol_id=?, nombre=?, usuario=?
         WHERE id=?`,
        [rol_id, nombre, usuario, Number(id)]
      );

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "usuarios",
        entidad_id: Number(id),
        detalle: `Usuario actualizado: ${usuario} (${nombre})`,
      });

      const io = getIO(req);
      if (io) io.to("admin").emit("usuarios:update", { action: "updated", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese usuario ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PATCH /api/usuarios/:id/activo
   body: { activo: 1/0 }
   admin
========================================================= */
router.patch(
  "/:id/activo",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = req.body?.activo;
    if (!(activo === 0 || activo === 1 || activo === "0" || activo === "1")) {
      return res.status(400).json({ ok: false, message: "activo debe ser 0 o 1." });
    }

    const [r] = await exec(`UPDATE usuarios SET activo=? WHERE id=?`, [Number(activo), Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "usuarios",
      entidad_id: Number(id),
      detalle: `Usuario ${Number(activo) ? "ACTIVADO" : "DESACTIVADO"}`,
    });

    const io = getIO(req);
    if (io) io.to("admin").emit("usuarios:update", { action: "toggle", id: Number(id), activo: Number(activo) });

    res.json({ ok: true });
  })
);

/* =========================================================
   PATCH /api/usuarios/:id/password
   body: { password }
   admin o el mismo usuario (self)
========================================================= */
router.patch(
  "/:id/password",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const password = String(req.body?.password || "");
    if (!password || password.length < 4) {
      return res.status(400).json({ ok: false, message: "Password muy corto." });
    }

    const rol = String(req.user?.rol || "").toLowerCase();
    const isAdmin = rol === "admin";
    const isSelf = Number(req.user?.id) === Number(id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ ok: false, message: "No autorizado." });
    }

    const hash = await bcrypt.hash(password, 10);

    const [r] = await exec(`UPDATE usuarios SET password_hash=? WHERE id=?`, [hash, Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "usuarios",
      entidad_id: Number(id),
      detalle: isSelf ? "Usuario cambió su contraseña" : "Admin cambió contraseña",
    });

    res.json({ ok: true });
  })
);

/* =========================================================
   POST /api/usuarios/:id/reset-password
   admin
   Retorna temp_password (para que se lo des al usuario)
========================================================= */
router.post(
  "/:id/reset-password",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [ex] = await exec(`SELECT id, usuario FROM usuarios WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });

    const temp = genTempPassword(8);
    const hash = await bcrypt.hash(temp, 10);

    await exec(`UPDATE usuarios SET password_hash=? WHERE id=?`, [hash, Number(id)]);

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "usuarios",
      entidad_id: Number(id),
      detalle: `Reset password de ${ex[0].usuario}`,
    });

    res.json({ ok: true, temp_password: temp });
  })
);

export default router;
