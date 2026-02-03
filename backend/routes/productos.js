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
  const categoria_id = req.query.categoria_id;

  let where = "1=1";
  const params = [];

  if (en_menu !== undefined) {
    where += " AND p.en_menu=?";
    params.push(Number(en_menu));
  }
  if (activo !== undefined) {
    where += " AND p.activo=?";
    params.push(Number(activo));
  }
  if (categoria_id !== undefined) {
    where += " AND p.categoria_id=?";
    params.push(Number(categoria_id));
  }

  const [rows] = await db.query(
    `SELECT p.*, c.nombre AS categoria_nombre, c.orden AS categoria_orden
     FROM productos p
     INNER JOIN categorias c ON c.id = p.categoria_id
     WHERE ${where}
     ORDER BY c.orden ASC, p.nombre ASC`,
    params,
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

// ✅ Eliminar producto (solo admin)
router.delete("/:id", auth, allowRoles("admin"), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = req.params.id;

    await conn.beginTransaction();

    // 1) quitar asignaciones de modificadores (si existen)
    await conn.query(`DELETE FROM producto_modificadores WHERE producto_id=?`, [id]);

    // 2) borrar producto
    await conn.query(`DELETE FROM productos WHERE id=?`, [id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("DELETE /productos/:id error:", err);
    res.status(500).json({ message: "Error al eliminar producto" });
  } finally {
    conn.release();
  }
});


export default router;
