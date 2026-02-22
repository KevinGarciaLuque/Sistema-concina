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

// ===== LISTAR DESCUENTOS =====
router.get(
  "/",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      `SELECT * FROM descuentos ORDER BY orden ASC, nombre ASC`
    );
    res.json(rows);
  })
);

// ===== CREAR DESCUENTO =====
router.post(
  "/",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const {
      nombre,
      tipo,
      valor,
      tipo_aplicacion,
      motivo,
      requiere_autorizacion,
      limite_porcentaje,
      descripcion,
      activo,
      orden,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (!["PORCENTAJE", "MONTO_FIJO"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo debe ser PORCENTAJE o MONTO_FIJO" });
    }

    if (valor == null || valor < 0) {
      return res.status(400).json({ error: "El valor debe ser mayor o igual a 0" });
    }

    if (tipo === "PORCENTAJE" && valor > 100) {
      return res.status(400).json({ error: "El porcentaje no puede ser mayor a 100%" });
    }

    if (!["POR_ITEM", "POR_TOTAL"].includes(tipo_aplicacion)) {
      return res.status(400).json({ error: "tipo_aplicacion debe ser POR_ITEM o POR_TOTAL" });
    }

    const motivosValidos = ["PROMO", "CORTESIA", "CUPON", "TERCERA_EDAD", "CUARTA_EDAD", "DISCAPACIDAD", "DANO", "OTRO"];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({ error: "Motivo inválido" });
    }

    const [result] = await exec(
      `INSERT INTO descuentos 
        (nombre, tipo, valor, tipo_aplicacion, motivo, requiere_autorizacion, limite_porcentaje, descripcion, activo, orden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        tipo,
        valor,
        tipo_aplicacion,
        motivo,
        requiere_autorizacion ? 1 : 0,
        limite_porcentaje || null,
        descripcion?.trim() || null,
        activo ? 1 : 0,
        orden || 999,
      ]
    );

    await bitacoraSafe(req, {
      accion: "CREAR",
      entidad: "descuentos",
      entidad_id: result.insertId,
      detalle: `Creó descuento: ${nombre}`,
    });

    const [rows] = await exec(`SELECT * FROM descuentos WHERE id = ?`, [result.insertId]);
    res.json(rows[0]);
  })
);

// ===== ACTUALIZAR DESCUENTO =====
router.put(
  "/:id",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      nombre,
      tipo,
      valor,
      tipo_aplicacion,
      motivo,
      requiere_autorizacion,
      limite_porcentaje,
      descripcion,
      activo,
      orden,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (!["PORCENTAJE", "MONTO_FIJO"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo debe ser PORCENTAJE o MONTO_FIJO" });
    }

    if (valor == null || valor < 0) {
      return res.status(400).json({ error: "El valor debe ser mayor o igual a 0" });
    }

    if (tipo === "PORCENTAJE" && valor > 100) {
      return res.status(400).json({ error: "El porcentaje no puede ser mayor a 100%" });
    }

    if (!["POR_ITEM", "POR_TOTAL"].includes(tipo_aplicacion)) {
      return res.status(400).json({ error: "tipo_aplicacion debe ser POR_ITEM o POR_TOTAL" });
    }

    const motivosValidos = ["PROMO", "CORTESIA", "CUPON", "TERCERA_EDAD", "CUARTA_EDAD", "DISCAPACIDAD", "DANO", "OTRO"];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({ error: "Motivo inválido" });
    }

    await exec(
      `UPDATE descuentos 
      SET nombre = ?, tipo = ?, valor = ?, tipo_aplicacion = ?, motivo = ?, 
          requiere_autorizacion = ?, limite_porcentaje = ?, descripcion = ?, activo = ?, orden = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        tipo,
        valor,
        tipo_aplicacion,
        motivo,
        requiere_autorizacion ? 1 : 0,
        limite_porcentaje || null,
        descripcion?.trim() || null,
        activo ? 1 : 0,
        orden || 999,
        id,
      ]
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "descuentos",
      entidad_id: id,
      detalle: `Actualizó descuento: ${nombre}`,
    });

    const [rows] = await exec(`SELECT * FROM descuentos WHERE id = ?`, [id]);
    res.json(rows[0]);
  })
);

// ===== ELIMINAR DESCUENTO =====
router.delete(
  "/:id",
  requireAuth,
  requirePermiso("AJUSTES_PRECIOS.ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await exec(`SELECT nombre FROM descuentos WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Descuento no encontrado" });
    }

    await exec(`DELETE FROM descuentos WHERE id = ?`, [id]);

    await bitacoraSafe(req, {
      accion: "ELIMINAR",
      entidad: "descuentos",
      entidad_id: id,
      detalle: `Eliminó descuento: ${rows[0].nombre}`,
    });

    res.json({ ok: true, message: "Descuento eliminado" });
  })
);

export default router;
