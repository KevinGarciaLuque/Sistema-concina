// backend/routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";

const router = Router();

// Pool compatible con tus otros archivos
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

// Middleware auth compatible con tu patrón
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;

/**
 * POST /api/auth/login
 * body: { usuario, password }
 */
router.post("/login", async (req, res, next) => {
  try {
    const usuario = String(req.body?.usuario || "").trim();
    const password = String(req.body?.password || "");

    if (!usuario || !password) {
      return res.status(400).json({ ok: false, message: "Faltan credenciales" });
    }

    const [rows] = await exec(
      `
      SELECT 
        u.id,
        u.rol_id,
        u.nombre,
        u.usuario,
        u.password_hash,
        u.activo,
        r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      WHERE u.usuario = ?
      LIMIT 1
      `,
      [usuario]
    );

    const user = rows?.[0];
    if (!user) return res.status(401).json({ ok: false, message: "Usuario o clave incorrecta" });
    if (!user.activo) return res.status(403).json({ ok: false, message: "Usuario inactivo" });

    const okPass = await bcrypt.compare(password, user.password_hash);
    if (!okPass) return res.status(401).json({ ok: false, message: "Usuario o clave incorrecta" });

    // ✅ Cargar permisos del rol (opcional pero recomendado para el menú)
    const [permRows] = await exec(
      `
      SELECT p.clave
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ?
      ORDER BY p.id
      `,
      [Number(user.rol_id)]
    );

    const permisos = (permRows || []).map((r) => String(r.clave));

    // ✅ Token con rol_id (clave para permisos)
    const token = jwt.sign(
      {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        rol_id: user.rol_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        rol_id: user.rol_id,
      },
      permisos, // ✅ el frontend ya puede pintar menú sin otra llamada
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <token>
 * (Compatibilidad: devuelve el payload del token)
 */
router.get("/me", requireAuth, async (req, res) => {
  return res.json({ ok: true, user: req.user });
});

export default router;
