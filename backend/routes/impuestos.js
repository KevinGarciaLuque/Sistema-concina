import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import { requirePermiso } from "../middleware/authorizePermiso.js";

const router = express.Router();

/* ===== Pool compatible ===== */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

/* ===== Middlewares ===== */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;

if (!requireAuth) throw new Error("No se encontró middleware auth");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

// ===== LISTAR IMPUESTOS =====
router.get(
  "/",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      `SELECT 
        i.*,
        c.nombre as categoria_nombre
      FROM impuestos i
      LEFT JOIN categorias c ON c.id = i.categoria_id
      ORDER BY i.orden ASC, i.nombre ASC`
    );
    res.json(rows);
  })
);

// ===== CREAR IMPUESTO =====
router.post(
  "/",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const {
      nombre,
      porcentaje,
      tipo_aplicacion,
      incluido_en_precio,
      categoria_id,
      descripcion,
      activo,
      orden,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (porcentaje == null || porcentaje < 0) {
      return res.status(400).json({ error: "El porcentaje debe ser mayor o igual a 0" });
    }

    if (!["POR_ITEM", "POR_TOTAL"].includes(tipo_aplicacion)) {
      return res.status(400).json({ error: "tipo_aplicacion debe ser POR_ITEM o POR_TOTAL" });
    }

    const [result] = await exec(
      `INSERT INTO impuestos 
        (nombre, porcentaje, tipo_aplicacion, incluido_en_precio, categoria_id, descripcion, activo, orden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        porcentaje,
        tipo_aplicacion,
        incluido_en_precio ? 1 : 0,
        categoria_id || null,
        descripcion?.trim() || null,
        activo ? 1 : 0,
        orden || 999,
      ]
    );

    await bitacoraSafe(req, {
      accion: "CREAR",
      entidad: "impuestos",
      entidad_id: result.insertId,
      detalle: `Creó impuesto: ${nombre}`,
    });

    const [rows] = await exec(`SELECT * FROM impuestos WHERE id = ?`, [result.insertId]);
    res.json(rows[0]);
  })
);

// ===== ACTUALIZAR IMPUESTO =====
router.put(
  "/:id",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      nombre,
      porcentaje,
      tipo_aplicacion,
      incluido_en_precio,
      categoria_id,
      descripcion,
      activo,
      orden,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (porcentaje == null || porcentaje < 0) {
      return res.status(400).json({ error: "El porcentaje debe ser mayor o igual a 0" });
    }

    if (!["POR_ITEM", "POR_TOTAL"].includes(tipo_aplicacion)) {
      return res.status(400).json({ error: "tipo_aplicacion debe ser POR_ITEM o POR_TOTAL" });
    }

    await exec(
      `UPDATE impuestos 
      SET nombre = ?, porcentaje = ?, tipo_aplicacion = ?, incluido_en_precio = ?, 
          categoria_id = ?, descripcion = ?, activo = ?, orden = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        porcentaje,
        tipo_aplicacion,
        incluido_en_precio ? 1 : 0,
        categoria_id || null,
        descripcion?.trim() || null,
        activo ? 1 : 0,
        orden || 999,
        id,
      ]
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "impuestos",
      entidad_id: id,
      detalle: `Actualizó impuesto: ${nombre}`,
    });

    const [rows] = await exec(`SELECT * FROM impuestos WHERE id = ?`, [id]);
    res.json(rows[0]);
  })
);

// ===== ELIMINAR IMPUESTO =====
router.delete(
  "/:id",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await exec(`SELECT nombre FROM impuestos WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Impuesto no encontrado" });
    }

    await exec(`DELETE FROM impuestos WHERE id = ?`, [id]);

    await bitacoraSafe(req, {
      accion: "ELIMINAR",
      entidad: "impuestos",
      entidad_id: id,
      detalle: `Eliminó impuesto: ${rows[0].nombre}`,
    });

    res.json({ ok: true, message: "Impuesto eliminado" });
  })
);

export default router;
