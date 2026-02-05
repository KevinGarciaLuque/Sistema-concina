const express = require("express");
const router = express.Router();

const dbRaw = require("../db");
const pool = dbRaw?.execute ? dbRaw : dbRaw?.pool || dbRaw;

const asyncHandler = require("../utils/asyncHandler");
const { registrarBitacora, getIp } = require("../utils/bitacora");

const authRaw = require("../middleware/auth");
const rolesRaw = require("../middleware/roles");

const auth = authRaw?.requireAuth || authRaw?.auth || authRaw;
const allowRoles =
  rolesRaw?.allowRoles || rolesRaw?.permitirRoles || rolesRaw?.roles || rolesRaw;

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

const isInt = (v) => Number.isInteger(Number(v));

/**
 * GET /api/modificadores?activo=1
 */
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { activo } = req.query;
    const where = [];
    const params = [];

    if (activo !== undefined) {
      where.push("m.activo = ?");
      params.push(Number(activo) ? 1 : 0);
    }

    const [rows] = await exec(
      `SELECT m.id, m.nombre, m.requerido, m.multiple, m.activo, m.created_at
       FROM modificadores m
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY m.nombre ASC`,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/**
 * POST /api/modificadores
 * body: { nombre, requerido?, multiple?, activo? }
 */
router.post(
  "/",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { nombre, requerido = 0, multiple = 0, activo = 1 } = req.body || {};

    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `INSERT INTO modificadores (nombre, requerido, multiple, activo)
       VALUES (?, ?, ?, ?)`,
      [String(nombre).trim(), Number(requerido) ? 1 : 0, Number(multiple) ? 1 : 0, Number(activo) ? 1 : 0]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "CREAR",
      entidad: "modificadores",
      entidad_id: r.insertId,
      detalle: `Modificador creado: ${nombre}`,
      ip: getIp(req),
    });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/**
 * PUT /api/modificadores/:id
 */
router.put(
  "/:id",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const { nombre, requerido, multiple, activo } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `UPDATE modificadores
       SET nombre = ?, requerido = COALESCE(?, requerido), multiple = COALESCE(?, multiple), activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        String(nombre).trim(),
        requerido === undefined ? null : (Number(requerido) ? 1 : 0),
        multiple === undefined ? null : (Number(multiple) ? 1 : 0),
        activo === undefined ? null : (Number(activo) ? 1 : 0),
        Number(id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "ACTUALIZAR",
      entidad: "modificadores",
      entidad_id: Number(id),
      detalle: `Modificador actualizado: ${nombre}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

/**
 * PATCH /api/modificadores/:id/activo
 * body: { activo: 0|1 }
 */
router.patch(
  "/:id/activo",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body || {};
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const val = Number(activo) ? 1 : 0;

    const [r] = await exec(`UPDATE modificadores SET activo = ? WHERE id = ?`, [
      val,
      Number(id),
    ]);

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: val ? "ACTIVAR" : "DESACTIVAR",
      entidad: "modificadores",
      entidad_id: Number(id),
      detalle: `Modificador ${val ? "activado" : "desactivado"}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

/* ===================== OPCIONES ===================== */

/**
 * GET /api/modificadores/:id/opciones
 */
router.get(
  "/:id/opciones",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `SELECT o.id, o.modificador_id, o.nombre, o.precio_extra, o.activo, o.orden, o.created_at
       FROM modificador_opciones o
       WHERE o.modificador_id = ?
       ORDER BY o.orden ASC, o.nombre ASC`,
      [Number(id)]
    );

    res.json({ ok: true, data: rows });
  })
);

/**
 * POST /api/modificadores/:id/opciones
 * body: { nombre, precio_extra?, activo?, orden? }
 */
router.post(
  "/:id/opciones",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const { nombre, precio_extra = 0, activo = 1, orden = 0 } = req.body || {};
    if (!nombre || String(nombre).trim().length < 1) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `INSERT INTO modificador_opciones (modificador_id, nombre, precio_extra, activo, orden)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(id), String(nombre).trim(), Number(precio_extra) || 0, Number(activo) ? 1 : 0, Number(orden) || 0]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "CREAR",
      entidad: "modificador_opciones",
      entidad_id: r.insertId,
      detalle: `Opción creada: ${nombre}`,
      ip: getIp(req),
    });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/**
 * PUT /api/modificadores/opciones/:opcionId
 */
router.put(
  "/opciones/:opcionId",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { opcionId } = req.params;
    if (!isInt(opcionId)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const { nombre, precio_extra, activo, orden } = req.body || {};
    if (!nombre || String(nombre).trim().length < 1) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `UPDATE modificador_opciones
       SET nombre = ?, precio_extra = COALESCE(?, precio_extra),
           activo = COALESCE(?, activo), orden = COALESCE(?, orden)
       WHERE id = ?`,
      [
        String(nombre).trim(),
        precio_extra === undefined ? null : (Number(precio_extra) || 0),
        activo === undefined ? null : (Number(activo) ? 1 : 0),
        orden === undefined ? null : (Number(orden) || 0),
        Number(opcionId),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "ACTUALIZAR",
      entidad: "modificador_opciones",
      entidad_id: Number(opcionId),
      detalle: `Opción actualizada: ${nombre}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

/**
 * PATCH /api/modificadores/opciones/:opcionId/activo
 */
router.patch(
  "/opciones/:opcionId/activo",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { opcionId } = req.params;
    const { activo } = req.body || {};
    if (!isInt(opcionId)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const val = Number(activo) ? 1 : 0;

    const [r] = await exec(`UPDATE modificador_opciones SET activo = ? WHERE id = ?`, [
      val,
      Number(opcionId),
    ]);

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    res.json({ ok: true });
  })
);

module.exports = router;
