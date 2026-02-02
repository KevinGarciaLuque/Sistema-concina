import { Router } from "express";
const router = Router();

// rutas aquí
router.get("/", (req, res) => {
  res.json({ ok: true });
});

export default router;   // 👈 ESTO ES CLAVE
