import { Router } from "express";
import db from "../db.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const router = Router();

/* =========================
   MODIFICADORES
   tabla: modificadores (id,nombre,requerido,multiple,activo,created_at)
========================= */

// GET /api/modificadores
router.get("/", auth, async (req, res) => {
  try {
    const activos = req.query.activos;
    let where = "1=1";
    const params = [];
    if (activos !== undefined) {
      where += " AND activo=?";
      params.push(Number(activos) ? 1 : 0);
    }

    const [rows] = await db.query(
      `SELECT * FROM modificadores WHERE ${where} ORDER BY id DESC`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /modificadores error:", err);
    res.status(500).json({ message: "Error al obtener modificadores" });
  }
});

// POST /api/modificadores
router.post("/", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { nombre, requerido, multiple, activo } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const [result] = await db.query(
      `INSERT INTO modificadores (nombre, requerido, multiple, activo)
       VALUES (?,?,?,?)`,
      [
        String(nombre).trim(),
        requerido ? 1 : 0,
        multiple ? 1 : 0,
        activo === undefined ? 1 : activo ? 1 : 0,
      ],
    );

    res.json({ id: result.insertId });
  } catch (err) {
    console.error("POST /modificadores error:", err);
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe un modificador con ese nombre" });
    }
    res.status(500).json({ message: "Error al crear modificador" });
  }
});

// PUT /api/modificadores/:id
router.put("/:id", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { nombre, requerido, multiple, activo } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    await db.query(
      `UPDATE modificadores
       SET nombre=?, requerido=?, multiple=?, activo=?
       WHERE id=?`,
      [
        String(nombre).trim(),
        requerido ? 1 : 0,
        multiple ? 1 : 0,
        activo ? 1 : 0,
        req.params.id,
      ],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /modificadores/:id error:", err);
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Ya existe un modificador con ese nombre" });
    }
    res.status(500).json({ message: "Error al actualizar modificador" });
  }
});

// PATCH /api/modificadores/:id/activo
router.patch("/:id/activo", auth, allowRoles("admin"), async (req, res) => {
  try {
    const activo = Number(req.body.activo) ? 1 : 0;
    await db.query(`UPDATE modificadores SET activo=? WHERE id=?`, [
      activo,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /modificadores/:id/activo error:", err);
    res.status(500).json({ message: "Error al cambiar estado" });
  }
});

// DELETE /api/modificadores/:id (solo admin)
// - borra primero opciones y asignaciones de productos
router.delete("/:id", auth, allowRoles("admin"), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = req.params.id;

    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM producto_modificadores WHERE modificador_id=?`,
      [id],
    );
    await conn.query(
      `DELETE FROM modificador_opciones WHERE modificador_id=?`,
      [id],
    );
    await conn.query(`DELETE FROM modificadores WHERE id=?`, [id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("DELETE /modificadores/:id error:", err);
    res.status(500).json({ message: "Error al eliminar modificador" });
  } finally {
    conn.release();
  }
});

/* =========================
   OPCIONES
   tabla: modificador_opciones (id,modificador_id,nombre,precio_extra,activo,orden,created_at)
========================= */

// GET /api/modificadores/:id/opciones
router.get("/:id/opciones", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM modificador_opciones
       WHERE modificador_id=?
       ORDER BY orden ASC, id ASC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("GET opciones error:", err);
    res.status(500).json({ message: "Error al obtener opciones" });
  }
});

// POST /api/modificadores/:id/opciones
router.post("/:id/opciones", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { nombre, precio_extra, activo, orden } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    let ordenFinal = Number(orden);
    if (!ordenFinal) {
      const [[r]] = await db.query(
        `SELECT COALESCE(MAX(orden),0)+1 AS nextOrden
         FROM modificador_opciones
         WHERE modificador_id=?`,
        [req.params.id],
      );
      ordenFinal = r.nextOrden;
    }

    const [result] = await db.query(
      `INSERT INTO modificador_opciones (modificador_id, nombre, precio_extra, activo, orden)
       VALUES (?,?,?,?,?)`,
      [
        req.params.id,
        String(nombre).trim(),
        Number(precio_extra) || 0,
        activo === undefined ? 1 : activo ? 1 : 0,
        ordenFinal,
      ],
    );

    res.json({ id: result.insertId });
  } catch (err) {
    console.error("POST opciones error:", err);
    res.status(500).json({ message: "Error al crear opción" });
  }
});

// PUT /api/modificadores/opciones/:opcionId
router.put(
  "/opciones/:opcionId",
  auth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const { nombre, precio_extra, activo, orden } = req.body;

      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ message: "El nombre es obligatorio" });
      }

      await db.query(
        `UPDATE modificador_opciones
       SET nombre=?, precio_extra=?, activo=?, orden=?
       WHERE id=?`,
        [
          String(nombre).trim(),
          Number(precio_extra) || 0,
          activo ? 1 : 0,
          Number(orden) || 1,
          req.params.opcionId,
        ],
      );

      res.json({ ok: true });
    } catch (err) {
      console.error("PUT opcion error:", err);
      res.status(500).json({ message: "Error al actualizar opción" });
    }
  },
);

// PATCH /api/modificadores/opciones/:opcionId/activo
router.patch(
  "/opciones/:opcionId/activo",
  auth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const activo = Number(req.body.activo) ? 1 : 0;
      await db.query(`UPDATE modificador_opciones SET activo=? WHERE id=?`, [
        activo,
        req.params.opcionId,
      ]);
      res.json({ ok: true });
    } catch (err) {
      console.error("PATCH opcion activo error:", err);
      res.status(500).json({ message: "Error al cambiar estado" });
    }
  },
);

// DELETE /api/modificadores/opciones/:opcionId
router.delete(
  "/opciones/:opcionId",
  auth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      await db.query(`DELETE FROM modificador_opciones WHERE id=?`, [
        req.params.opcionId,
      ]);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE opcion error:", err);
      res.status(500).json({ message: "Error al eliminar opción" });
    }
  },
);

/* =========================
   ASIGNACIÓN PRODUCTO ↔ MODIFICADORES (D)
========================= */

// GET /api/modificadores/producto/:productoId
router.get("/producto/:productoId", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT modificador_id FROM producto_modificadores WHERE producto_id=?`,
      [req.params.productoId],
    );
    res.json(rows.map((r) => r.modificador_id));
  } catch (err) {
    console.error("GET asignación error:", err);
    res.status(500).json({ message: "Error al obtener asignación" });
  }
});

// PUT /api/modificadores/producto/:productoId
router.put(
  "/producto/:productoId",
  auth,
  allowRoles("admin"),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { modificadores } = req.body;
      if (!Array.isArray(modificadores)) {
        return res
          .status(400)
          .json({ message: "modificadores debe ser un arreglo" });
      }

      await conn.beginTransaction();
      await conn.query(
        `DELETE FROM producto_modificadores WHERE producto_id=?`,
        [req.params.productoId],
      );

      for (const modId of modificadores) {
        await conn.query(
          `INSERT INTO producto_modificadores (producto_id, modificador_id) VALUES (?,?)`,
          [req.params.productoId, modId],
        );
      }

      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error("PUT asignación error:", err);
      res.status(500).json({ message: "Error al guardar asignación" });
    } finally {
      conn.release();
    }
  },
);

export default router;
