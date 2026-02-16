// backend/routes/me.js
import express from "express";
import * as authMod from "../middleware/auth.js";
import { cargarPermisos } from "../middleware/authorizePermiso.js";

const router = express.Router();
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;

// Perfil + permisos
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const set = await cargarPermisos(req);
    res.json({
      ok: true,
      user: req.user,
      permisos: Array.from(set),
    });
  } catch (e) {
    next(e);
  }
});

// Solo permisos (si lo ocupas)
router.get("/permisos", requireAuth, async (req, res, next) => {
  try {
    const set = await cargarPermisos(req);
    res.json({ ok: true, data: Array.from(set) });
  } catch (e) {
    next(e);
  }
});

export default router;
