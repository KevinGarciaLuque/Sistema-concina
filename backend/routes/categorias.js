const express = require("express");
const router = express.Router();

const dbRaw = require("../db");
const pool = dbRaw?.execute ? dbRaw : dbRaw?.pool || dbRaw;

const asyncHandler = require("../utils/asyncHandler");
const { registrarBitacora, getIp } = require("../utils/bitacora");

// middlewares (compatibles con varias formas de export)
const authRaw = require("../middleware/auth");
const rolesRaw = require("../middleware/roles");

const auth = authRaw?.requireAuth || authRaw?.auth || authRaw;
const allowRoles =
  rolesRaw?.allowRoles || rolesRaw?.permitirRoles || rolesRaw?.roles || rolesRaw;

// helper query
const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

const isInt = (v) => Number.isInteger(Number(v));

/**
 * GET /api/categorias?activo=1
 * Lista categorías (orden ASC, nombre ASC)
 */
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { activo } = req.query;
    const where = [];
    const params = [];

    if (activo !== undefined) {
      where.push("c.activo = ?");
      params.push(Number(activo) ? 1 : 0);
    }

    const sql = `
      SELECT c.id, c.nombre, c.activo, c.orden, c.created_at
      FROM categorias c
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY c.orden ASC, c.nombre ASC
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/**
 * POST /api/categorias
 * body: { nombre, orden?, activo? }
 * admin/supervisor
 */
router.post(
  "/",
  auth,
  allowRoles?.("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { nombre, orden = 0, activo = 1 } = req.body || {};

    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre de categoría inválido." });
    }

    const [r] = await exec(
      `INSERT INTO categorias (nombre, activo, orden) VALUES (?, ?, ?)`,
      [String(nombre).trim(), Number(activo) ? 1 : 0, Number(orden) || 0]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "CREAR",
      entidad: "categorias",
      entidad_id: r.insertId,
      detalle: `Categoría creada: ${nombre}`,
      ip: getIp(req),
    });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/**
 * PUT /api/categorias/:id
 * body: { nombre, orden?, activo? }
 */
router.put(
  "/:id",
  auth,
  allowRoles?.("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const { nombre, orden, activo } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre de categoría inválido." });
    }

    const [r] = await exec(
      `UPDATE categorias
       SET nombre = ?, orden = COALESCE(?, orden), activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        String(nombre).trim(),
        orden === undefined ? null : Number(orden) || 0,
        activo === undefined ? null : (Number(activo) ? 1 : 0),
        Number(id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Categoría no encontrada." });
    }

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "ACTUALIZAR",
      entidad: "categorias",
      entidad_id: Number(id),
      detalle: `Categoría actualizada: ${nombre}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

/**
 * PATCH /api/categorias/:id/activo
 * body: { activo: 0|1 }
 */
router.patch(
  "/:id/activo",
  auth,
  allowRoles?.("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body || {};
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const val = Number(activo) ? 1 : 0;

    const [r] = await exec(
      `UPDATE categorias SET activo = ? WHERE id = ?`,
      [val, Number(id)]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Categoría no encontrada." });
    }

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: val ? "ACTIVAR" : "DESACTIVAR",
      entidad: "categorias",
      entidad_id: Number(id),
      detalle: `Categoría ${val ? "activada" : "desactivada"}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

module.exports = router;
