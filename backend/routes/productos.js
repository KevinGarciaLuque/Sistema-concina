// routes/productos.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import db from "../db.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const router = Router();

const storage = multer.diskStorage({
  destination: "uploads/productos",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `prod_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ✅ Listado para POS (solo activos y en_menu)
router.get("/", auth, async (req, res) => {
  const en_menu = req.query.en_menu;
  const activo = req.query.activo;

  let where = "1=1";
  const params = [];
  if (en_menu !== undefined) { where += " AND en_menu=?"; params.push(Number(en_menu)); }
  if (activo !== undefined) { where += " AND activo=?"; params.push(Number(activo)); }

  const [rows] = await db.query(
    `SELECT * FROM productos WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
});

// ✅ Crear producto (admin)
router.post("/", auth, allowRoles("admin"), async (req, res) => {
  const { categoria_id, nombre, descripcion, precio, es_combo, activo, en_menu } = req.body;
  const [result] = await db.query(
    `INSERT INTO productos (categoria_id, nombre, descripcion, precio, es_combo, activo, en_menu)
     VALUES (?,?,?,?,?,?,?)`,
    [categoria_id, nombre, descripcion || null, precio, es_combo ? 1 : 0, activo ? 1 : 0, en_menu ? 1 : 0]
  );
  res.json({ id: result.insertId });
});

// ✅ Editar producto
router.put("/:id", auth, allowRoles("admin"), async (req, res) => {
  const { categoria_id, nombre, descripcion, precio, es_combo, activo, en_menu } = req.body;
  await db.query(
    `UPDATE productos
     SET categoria_id=?, nombre=?, descripcion=?, precio=?, es_combo=?, activo=?, en_menu=?
     WHERE id=?`,
    [categoria_id, nombre, descripcion || null, precio, es_combo ? 1 : 0, activo ? 1 : 0, en_menu ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

// ✅ Subir imagen
router.post("/:id/imagen", auth, allowRoles("admin"), upload.single("imagen"), async (req, res) => {
  const url = `/uploads/productos/${req.file.filename}`;
  await db.query(
    `UPDATE productos SET imagen_url=? WHERE id=?`,
    [url, req.params.id]
  );
  res.json({ ok: true, imagen_url: url });
});

export default router;
