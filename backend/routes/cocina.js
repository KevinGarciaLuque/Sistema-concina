// routes/cocina.js
import { Router } from "express";
import db from "../db.js";
import { io } from "../server.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const router = Router();

// Listar órdenes para KDS
router.get("/ordenes", auth, allowRoles("cocina","admin"), async (req, res) => {
  const estado = req.query.estado; // NUEVA, EN_PREPARACION, LISTA...
  const params = [];
  let where = "1=1";

  if (estado) { where += " AND estado=?"; params.push(estado); }

  const [rows] = await db.query(
    `SELECT * FROM ordenes WHERE ${where} ORDER BY created_at ASC`,
    params
  );
  res.json(rows);
});

// Cambiar estado
router.put("/ordenes/:id/estado", auth, allowRoles("cocina","admin"), async (req, res) => {
  const { estado, comentario } = req.body;

  await db.query(`UPDATE ordenes SET estado=? WHERE id=?`, [estado, req.params.id]);
  await db.query(
    `INSERT INTO orden_estados_historial (orden_id, estado, cambiado_por, comentario)
     VALUES (?,?,?,?)`,
    [req.params.id, estado, req.user.id, comentario || null]
  );

  // 🔔 avisar a caja
  io.to("caja").emit("order:statusChanged", { orden_id: req.params.id, estado });

  res.json({ ok: true });
});

export default router;
