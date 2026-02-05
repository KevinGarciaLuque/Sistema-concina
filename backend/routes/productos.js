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
 * GET /api/productos?q=&categoria_id=&activo=&en_menu=&es_combo=
 * Lista productos con categoría
 */
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { q, categoria_id, activo, en_menu, es_combo } = req.query;

    const where = [];
    const params = [];

    if (q) {
      where.push("(p.nombre LIKE ? OR p.descripcion LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (categoria_id !== undefined) {
      where.push("p.categoria_id = ?");
      params.push(Number(categoria_id));
    }
    if (activo !== undefined) {
      where.push("p.activo = ?");
      params.push(Number(activo) ? 1 : 0);
    }
    if (en_menu !== undefined) {
      where.push("p.en_menu = ?");
      params.push(Number(en_menu) ? 1 : 0);
    }
    if (es_combo !== undefined) {
      where.push("p.es_combo = ?");
      params.push(Number(es_combo) ? 1 : 0);
    }

    const sql = `
      SELECT
        p.id, p.categoria_id, c.nombre AS categoria_nombre,
        p.nombre, p.descripcion, p.precio,
        p.imagen_url, p.imagen_public_id,
        p.activo, p.es_combo, p.en_menu,
        p.created_at, p.updated_at
      FROM productos p
      INNER JOIN categorias c ON c.id = p.categoria_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.created_at DESC, p.nombre ASC
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  })
);

/**
 * GET /api/productos/:id
 */
router.get(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `SELECT
         p.*,
         c.nombre AS categoria_nombre
       FROM productos p
       INNER JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = ?`,
      [Number(id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Producto no encontrado." });
    res.json({ ok: true, data: rows[0] });
  })
);

/**
 * POST /api/productos
 * body: { categoria_id, nombre, descripcion?, precio?, imagen_url?, imagen_public_id?, activo?, es_combo?, en_menu? }
 */
router.post(
  "/",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const {
      categoria_id,
      nombre,
      descripcion = null,
      precio = 0,
      imagen_url = null,
      imagen_public_id = null,
      activo = 1,
      es_combo = 0,
      en_menu = 1,
    } = req.body || {};

    if (!isInt(categoria_id)) {
      return res.status(400).json({ ok: false, message: "categoria_id inválido." });
    }
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `INSERT INTO productos
       (categoria_id, nombre, descripcion, precio, imagen_url, imagen_public_id, activo, es_combo, en_menu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(categoria_id),
        String(nombre).trim(),
        descripcion ? String(descripcion).trim() : null,
        Number(precio) || 0,
        imagen_url ? String(imagen_url).trim() : null,
        imagen_public_id ? String(imagen_public_id).trim() : null,
        Number(activo) ? 1 : 0,
        Number(es_combo) ? 1 : 0,
        Number(en_menu) ? 1 : 0,
      ]
    );

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "CREAR",
      entidad: "productos",
      entidad_id: r.insertId,
      detalle: `Producto creado: ${nombre}`,
      ip: getIp(req),
    });

    res.status(201).json({ ok: true, id: r.insertId });
  })
);

/**
 * PUT /api/productos/:id
 */
router.put(
  "/:id",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const {
      categoria_id,
      nombre,
      descripcion,
      precio,
      imagen_url,
      imagen_public_id,
      activo,
      es_combo,
      en_menu,
    } = req.body || {};

    if (categoria_id !== undefined && !isInt(categoria_id)) {
      return res.status(400).json({ ok: false, message: "categoria_id inválido." });
    }
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }

    const [r] = await exec(
      `UPDATE productos
       SET
         categoria_id = COALESCE(?, categoria_id),
         nombre = ?,
         descripcion = ?,
         precio = COALESCE(?, precio),
         imagen_url = COALESCE(?, imagen_url),
         imagen_public_id = COALESCE(?, imagen_public_id),
         activo = COALESCE(?, activo),
         es_combo = COALESCE(?, es_combo),
         en_menu = COALESCE(?, en_menu)
       WHERE id = ?`,
      [
        categoria_id === undefined ? null : Number(categoria_id),
        String(nombre).trim(),
        descripcion === undefined ? null : (descripcion ? String(descripcion).trim() : null),
        precio === undefined ? null : (Number(precio) || 0),
        imagen_url === undefined ? null : (imagen_url ? String(imagen_url).trim() : null),
        imagen_public_id === undefined ? null : (imagen_public_id ? String(imagen_public_id).trim() : null),
        activo === undefined ? null : (Number(activo) ? 1 : 0),
        es_combo === undefined ? null : (Number(es_combo) ? 1 : 0),
        en_menu === undefined ? null : (Number(en_menu) ? 1 : 0),
        Number(id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "ACTUALIZAR",
      entidad: "productos",
      entidad_id: Number(id),
      detalle: `Producto actualizado: ${nombre}`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

/**
 * PATCH /api/productos/:id/activo
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

    const [r] = await exec(`UPDATE productos SET activo = ? WHERE id = ?`, [val, Number(id)]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    res.json({ ok: true });
  })
);

/**
 * PATCH /api/productos/:id/menu
 */
router.patch(
  "/:id/menu",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { en_menu } = req.body || {};
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const val = Number(en_menu) ? 1 : 0;

    const [r] = await exec(`UPDATE productos SET en_menu = ? WHERE id = ?`, [val, Number(id)]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "No encontrado." });

    res.json({ ok: true });
  })
);

/* ===================== MODIFICADORES POR PRODUCTO ===================== */

/**
 * GET /api/productos/:id/modificadores
 * Devuelve modificadores asignados a este producto + opciones activas
 */
router.get(
  "/:id/modificadores",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [mods] = await exec(
      `SELECT m.id, m.nombre, m.requerido, m.multiple, m.activo
       FROM producto_modificadores pm
       INNER JOIN modificadores m ON m.id = pm.modificador_id
       WHERE pm.producto_id = ?
       ORDER BY m.nombre ASC`,
      [Number(id)]
    );

    const modIds = mods.map((m) => m.id);
    let opciones = [];

    if (modIds.length) {
      const [ops] = await exec(
        `SELECT o.id, o.modificador_id, o.nombre, o.precio_extra, o.activo, o.orden
         FROM modificador_opciones o
         WHERE o.modificador_id IN (${modIds.map(() => "?").join(",")})
         ORDER BY o.modificador_id ASC, o.orden ASC, o.nombre ASC`,
        modIds
      );
      opciones = ops;
    }

    const data = mods.map((m) => ({
      ...m,
      opciones: opciones.filter((o) => o.modificador_id === m.id),
    }));

    res.json({ ok: true, data });
  })
);

/**
 * PUT /api/productos/:id/modificadores
 * body: { modificador_ids: number[] }
 * Reemplaza los modificadores asignados al producto.
 */
router.put(
  "/:id/modificadores",
  auth,
  allowRoles?.("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { modificador_ids } = req.body || {};

    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });
    if (!Array.isArray(modificador_ids)) {
      return res.status(400).json({ ok: false, message: "modificador_ids debe ser un arreglo." });
    }

    const ids = [...new Set(modificador_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];

    // si tu pool soporta transacciones, lo hacemos perfecto:
    if (pool.getConnection) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.execute(`DELETE FROM producto_modificadores WHERE producto_id = ?`, [Number(id)]);

        for (const mid of ids) {
          await conn.execute(
            `INSERT INTO producto_modificadores (producto_id, modificador_id) VALUES (?, ?)`,
            [Number(id), mid]
          );
        }

        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    } else {
      // fallback sin transacción
      await exec(`DELETE FROM producto_modificadores WHERE producto_id = ?`, [Number(id)]);
      for (const mid of ids) {
        await exec(
          `INSERT INTO producto_modificadores (producto_id, modificador_id) VALUES (?, ?)`,
          [Number(id), mid]
        );
      }
    }

    await registrarBitacora(dbRaw, {
      usuario_id: req.user?.id ?? null,
      accion: "ACTUALIZAR",
      entidad: "producto_modificadores",
      entidad_id: Number(id),
      detalle: `Asignación modificadores producto_id=${id} [${ids.join(", ")}]`,
      ip: getIp(req),
    });

    res.json({ ok: true });
  })
);

module.exports = router;
