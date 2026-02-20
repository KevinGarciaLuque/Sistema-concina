import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* ===== DB pool compatible ===== */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

/* ===== Middlewares compatibles ===== */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

if (!requireAuth) throw new Error("No se encontró middleware auth en middleware/auth.js");
if (!allowRoles) throw new Error("No se encontró middleware roles en middleware/roles.js");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

/* ===== Utils ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "productos");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

function emitCatalogo(req, extra = {}) {
  const io = getIO(req);
  if (!io) return;
  io.emit("catalogo:update", { entity: "productos", ts: Date.now(), ...extra });
}

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

function toBoolInt(v, def = null) {
  if (v === 0 || v === 1) return Number(v);
  if (v === "0" || v === "1") return Number(v);
  return def;
}

/* ===== Multer (subida local) ===== */
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `prod_${Date.now()}_${Math.floor(Math.random() * 100000)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

/* =========================================================
   GET /api/productos
   query: q, categoria_id, activo, en_menu, es_combo
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina", "mesero"),
  asyncHandler(async (req, res) => {
    const { q, categoria_id, activo, en_menu, es_combo } = req.query;

    const where = [];
    const params = [];

    if (q) {
      where.push("(p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (categoria_id !== undefined && categoria_id !== "" && isInt(categoria_id)) {
      where.push("p.categoria_id = ?");
      params.push(Number(categoria_id));
    }

    const a = toBoolInt(activo);
    const m = toBoolInt(en_menu);
    const combo = toBoolInt(es_combo);

    if (a !== null) {
      where.push("p.activo = ?");
      params.push(a);
    }
    if (m !== null) {
      where.push("p.en_menu = ?");
      params.push(m);
    }
    if (combo !== null) {
      where.push("p.es_combo = ?");
      params.push(combo);
    }

    const [rows] = await exec(
      `
      SELECT
        p.id, p.categoria_id, c.nombre AS categoria,
        p.nombre, p.descripcion, p.precio,
        p.imagen_url, p.imagen_public_id,
        p.activo, p.es_combo, p.en_menu,
        p.created_at, p.updated_at
      FROM productos p
      INNER JOIN categorias c ON c.id = p.categoria_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.id DESC
      LIMIT 500
      `,
      params
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   GET /api/productos/:id
========================================================= */
router.get(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero", "cocina"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `
      SELECT
        p.id, p.categoria_id, c.nombre AS categoria,
        p.nombre, p.descripcion, p.precio,
        p.imagen_url, p.imagen_public_id,
        p.activo, p.es_combo, p.en_menu,
        p.created_at, p.updated_at
      FROM productos p
      INNER JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ?
      `,
      [Number(id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Producto no encontrado." });
    res.json({ ok: true, data: rows[0] });
  })
);

/* =========================================================
   POST /api/productos
   body: { categoria_id, nombre, descripcion?, precio, activo?, es_combo?, en_menu? }
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const categoria_id = Number(req.body?.categoria_id);
    const nombre = String(req.body?.nombre || "").trim();
    const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim().slice(0, 255) : null;
    const precio = Number(req.body?.precio);

    const activo = toBoolInt(req.body?.activo, 1);
    const es_combo = toBoolInt(req.body?.es_combo, 0);
    const en_menu = toBoolInt(req.body?.en_menu, 1);

    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      return res.status(400).json({ ok: false, message: "categoria_id inválido." });
    }
    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }
    if (!Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ ok: false, message: "Precio inválido." });
    }

    // valida categoría
    const [cat] = await exec(`SELECT id FROM categorias WHERE id=?`, [categoria_id]);
    if (!cat.length) return res.status(409).json({ ok: false, message: "La categoría no existe." });

    try {
      const [r] = await exec(
        `INSERT INTO productos (categoria_id, nombre, descripcion, precio, activo, es_combo, en_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [categoria_id, nombre, descripcion, precio, activo, es_combo, en_menu]
      );

      await bitacoraSafe(req, {
        accion: "CREAR",
        entidad: "productos",
        entidad_id: r.insertId,
        detalle: `Producto creado: ${nombre} (L ${precio.toFixed(2)})`,
      });

      emitCatalogo(req, { action: "created", id: r.insertId });

      res.status(201).json({ ok: true, id: r.insertId });
    } catch (e) {
      if (String(e?.message || "").includes("Duplicate")) {
        return res.status(409).json({ ok: false, message: "Ese producto ya existe." });
      }
      throw e;
    }
  })
);

/* =========================================================
   PUT /api/productos/:id
   body: { categoria_id, nombre, descripcion?, precio, activo?, es_combo?, en_menu? }
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const categoria_id = Number(req.body?.categoria_id);
    const nombre = String(req.body?.nombre || "").trim();
    const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim().slice(0, 255) : null;
    const precio = Number(req.body?.precio);

    const activo = toBoolInt(req.body?.activo, null);
    const es_combo = toBoolInt(req.body?.es_combo, null);
    const en_menu = toBoolInt(req.body?.en_menu, null);

    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      return res.status(400).json({ ok: false, message: "categoria_id inválido." });
    }
    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }
    if (!Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ ok: false, message: "Precio inválido." });
    }

    const [ex] = await exec(`SELECT id FROM productos WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

    const [cat] = await exec(`SELECT id FROM categorias WHERE id=?`, [categoria_id]);
    if (!cat.length) return res.status(409).json({ ok: false, message: "La categoría no existe." });

    const sets = ["categoria_id=?", "nombre=?", "descripcion=?", "precio=?"];
    const params = [categoria_id, nombre, descripcion, precio];

    if (activo !== null) {
      sets.push("activo=?");
      params.push(activo);
    }
    if (es_combo !== null) {
      sets.push("es_combo=?");
      params.push(es_combo);
    }
    if (en_menu !== null) {
      sets.push("en_menu=?");
      params.push(en_menu);
    }

    params.push(Number(id));

    await exec(`UPDATE productos SET ${sets.join(", ")} WHERE id=?`, params);

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "productos",
      entidad_id: Number(id),
      detalle: `Producto actualizado: ${nombre}`,
    });

    emitCatalogo(req, { action: "updated", id: Number(id) });

    res.json({ ok: true });
  })
);

/* =========================================================
   PATCH /api/productos/:id/activo
   body: { activo: 1|0 }
========================================================= */
router.patch(
  "/:id/activo",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = toBoolInt(req.body?.activo, null);
    if (activo === null) return res.status(400).json({ ok: false, message: "activo debe ser 0 o 1." });

    const [r] = await exec(`UPDATE productos SET activo=? WHERE id=?`, [activo, Number(id)]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "productos",
      entidad_id: Number(id),
      detalle: `Producto ${activo ? "ACTIVADO" : "DESACTIVADO"}`,
    });

    emitCatalogo(req, { action: "toggle", id: Number(id), activo });

    res.json({ ok: true });
  })
);

/* =========================================================
   POST /api/productos/:id/imagen
   multipart/form-data field: imagen
   Guarda imagen local y actualiza imagen_url
========================================================= */
router.post(
  "/:id/imagen",
  requireAuth,
  allowRoles("admin", "supervisor"),
  upload.single("imagen"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [ex] = await exec(`SELECT id, imagen_url FROM productos WHERE id=?`, [Number(id)]);
    if (!ex.length) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

    if (!req.file) return res.status(400).json({ ok: false, message: "No se recibió archivo (imagen)." });

    // si había una imagen local previa, intentamos borrarla
    const prev = ex[0].imagen_url ? String(ex[0].imagen_url) : null;
    if (prev && prev.startsWith("/uploads/productos/")) {
      const prevPath = path.join(__dirname, "..", prev.replace("/uploads/", "uploads/"));
      try {
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      } catch {}
    }

    const imagen_url = `/uploads/productos/${req.file.filename}`;

    await exec(
      `UPDATE productos SET imagen_url=?, imagen_public_id=NULL WHERE id=?`,
      [imagen_url, Number(id)]
    );

    await bitacoraSafe(req, {
      accion: "ACTUALIZAR",
      entidad: "productos",
      entidad_id: Number(id),
      detalle: "Imagen actualizada",
    });

    emitCatalogo(req, { action: "image", id: Number(id) });

    res.json({ ok: true, imagen_url });
  })
);

/* =========================================================
   GET /api/productos/:id/modificadores
   Para tu pantalla: /admin/productos/:id/modificadores
========================================================= */
router.get(
  "/:id/modificadores",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const [rows] = await exec(
      `
      SELECT
        m.id, m.nombre, m.requerido, m.multiple, m.activo,
        (SELECT COUNT(*) FROM modificador_opciones mo WHERE mo.modificador_id = m.id) AS opciones_count,
        CASE WHEN pm.producto_id IS NULL THEN 0 ELSE 1 END AS asignado
      FROM modificadores m
      LEFT JOIN producto_modificadores pm
        ON pm.modificador_id = m.id AND pm.producto_id = ?
      ORDER BY m.nombre ASC
      `,
      [Number(id)]
    );

    res.json({ ok: true, data: rows });
  })
);

/* =========================================================
   PUT /api/productos/:id/modificadores
   body: { modificador_ids: [1,2,3] }  (reemplaza todos)
========================================================= */
router.put(
  "/:id/modificadores",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    const rawIds = req.body?.modificador_ids ?? req.body?.modificadores;
    const ids = Array.isArray(rawIds) ? rawIds : [];
    const modIds = ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);

    const [p] = await exec(`SELECT id FROM productos WHERE id=?`, [Number(id)]);
    if (!p.length) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

    if (!pool.getConnection) {
      return res.status(500).json({ ok: false, message: "Pool sin soporte de transacciones (getConnection)." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`DELETE FROM producto_modificadores WHERE producto_id=?`, [Number(id)]);

      for (const mid of modIds) {
        await conn.execute(
          `INSERT INTO producto_modificadores (producto_id, modificador_id) VALUES (?, ?)`,
          [Number(id), Number(mid)]
        );
      }

      await conn.commit();

      await bitacoraSafe(req, {
        accion: "ACTUALIZAR",
        entidad: "producto_modificadores",
        entidad_id: Number(id),
        detalle: `Modificadores actualizados (${modIds.length})`,
      });

      emitCatalogo(req, { action: "mods", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  })
);

/* =========================================================
   DELETE /api/productos/:id
========================================================= */
router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isInt(id)) return res.status(400).json({ ok: false, message: "ID inválido." });

    try {
      const [r] = await exec(`DELETE FROM productos WHERE id=?`, [Number(id)]);
      if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Producto no encontrado." });

      await bitacoraSafe(req, {
        accion: "ELIMINAR",
        entidad: "productos",
        entidad_id: Number(id),
        detalle: "Producto eliminado",
      });

      emitCatalogo(req, { action: "deleted", id: Number(id) });

      res.json({ ok: true });
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("foreign key")) {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: el producto está relacionado a órdenes u otras tablas.",
        });
      }
      throw e;
    }
  })
);

export default router;
