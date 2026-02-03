import { Router } from "express";
import db from "../db.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const router = Router();

/**
 * GET /api/categorias
 * - Para POS: solo activas (default)
 * - Query: ?todas=1 -> incluye inactivas
 */
router.get("/", auth, async (req, res) => {
  try {
    const todas = Number(req.query.todas || 0);

    const where = todas ? "1=1" : "activo=1";
    const [rows] = await db.query(
      `SELECT id, nombre, orden, activo
       FROM categorias
       WHERE ${where}
       ORDER BY orden ASC, nombre ASC`,
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /categorias error:", err);
    res.status(500).json({ message: "Error al obtener categorías" });
  }
});

/**
 * POST /api/categorias
 * body: { nombre, orden?, activo? }
 */
router.post("/", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { nombre, orden, activo } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    // Si no mandan orden, ponemos al final
    let ordenFinal = Number(orden);
    if (!ordenFinal) {
      const [[r]] = await db.query(
        `SELECT COALESCE(MAX(orden),0)+1 AS nextOrden FROM categorias`,
      );
      ordenFinal = r.nextOrden;
    }

    const [result] = await db.query(
      `INSERT INTO categorias (nombre, orden, activo) VALUES (?,?,?)`,
      [String(nombre).trim(), ordenFinal, activo ? 1 : 1], // por defecto activo=1
    );

    res.json({ id: result.insertId });
  } catch (err) {
    console.error("POST /categorias error:", err);
    // probable duplicado por UNIQUE(nombre)
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ message: "Error al crear categoría" });
  }
});

/**
 * PUT /api/categorias/:id
 * body: { nombre, orden, activo }
 */
router.put("/:id", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { nombre, orden, activo } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    await db.query(
      `UPDATE categorias SET nombre=?, orden=?, activo=? WHERE id=?`,
      [
        String(nombre).trim(),
        Number(orden) || 1,
        activo ? 1 : 0,
        req.params.id,
      ],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /categorias/:id error:", err);
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ message: "Error al actualizar categoría" });
  }
});

/**
 * PATCH /api/categorias/:id/activo
 * body: { activo: 0|1 }
 */
router.patch("/:id/activo", auth, allowRoles("admin"), async (req, res) => {
  try {
    const activo = Number(req.body.activo) ? 1 : 0;
    await db.query(`UPDATE categorias SET activo=? WHERE id=?`, [
      activo,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /categorias/:id/activo error:", err);
    res.status(500).json({ message: "Error al cambiar estado" });
  }
});

/**
 * PATCH /api/categorias/orden
 * body: { orden: [ {id, orden}, ... ] }
 * - útil para drag & drop
 */
router.patch("/orden", auth, allowRoles("admin"), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { orden } = req.body;
    if (!Array.isArray(orden) || orden.length === 0) {
      return res.status(400).json({ message: "Orden inválido" });
    }

    await conn.beginTransaction();
    for (const item of orden) {
      await conn.query(`UPDATE categorias SET orden=? WHERE id=?`, [
        Number(item.orden),
        item.id,
      ]);
    }
    await conn.commit();

    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("PATCH /categorias/orden error:", err);
    res.status(500).json({ message: "Error al ordenar categorías" });
  } finally {
    conn.release();
  }
});




// ✅ Eliminar categoría (solo admin)
// Regla: NO se permite si hay productos asociados
router.delete("/:id", auth, allowRoles("admin"), async (req, res) => {
  try {
    const id = req.params.id;

    // 1) verificar productos asociados
    const [[r]] = await db.query(
      `SELECT COUNT(*) AS total FROM productos WHERE categoria_id=?`,
      [id]
    );

    if (Number(r.total) > 0) {
      return res.status(409).json({
        message:
          "No se puede eliminar: esta categoría tiene productos. Mueve o elimina los productos primero (o desactiva la categoría).",
      });
    }

    // 2) borrar
    await db.query(`DELETE FROM categorias WHERE id=?`, [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /categorias/:id error:", err);
    res.status(500).json({ message: "Error al eliminar categoría" });
  }
});


export default router;
