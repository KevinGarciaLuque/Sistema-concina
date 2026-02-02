import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = Router();

/**
 * POST /api/auth/login
 * body: { usuario, password }
 */
router.post("/login", async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ msg: "Faltan credenciales" });
  }

  const [rows] = await db.query(
    `
    SELECT u.id, u.nombre, u.usuario, u.password_hash, u.activo, r.nombre AS rol
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.usuario = ?
    LIMIT 1
  `,
    [usuario]
  );

  const user = rows[0];
  if (!user) return res.status(401).json({ msg: "Usuario o clave incorrecta" });
  if (!user.activo) return res.status(403).json({ msg: "Usuario inactivo" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ msg: "Usuario o clave incorrecta" });

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  return res.json({
    token,
    user: { id: user.id, nombre: user.nombre, rol: user.rol },
  });
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <token>
 */
router.get("/me", async (req, res) => {
  // opcional: aquí podrías validar token con middleware, pero lo mantenemos simple en frontend
  res.json({ ok: true });
});

export default router;
