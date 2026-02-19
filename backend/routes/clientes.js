// backend/routes/clientes.js
import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* =========================
   DB pool compatible
========================= */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query)
    ? dbMod.default
    : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) {
  throw new Error(
    "No se pudo obtener el pool de DB desde db.js (export default o export const pool).",
  );
}

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* =========================
   Middlewares compatibles
========================= */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles =
  rolesMod.default ||
  rolesMod.allowRoles ||
  rolesMod.permitirRoles ||
  rolesMod.roles;

if (!requireAuth)
  throw new Error("No se encontró middleware de auth en middleware/auth.js");
if (!allowRoles)
  throw new Error("No se encontró middleware de roles en middleware/roles.js");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isInt = (v) => Number.isInteger(Number(v));
const clean = (v) => String(v ?? "").trim();
const cleanUpper = (v) => clean(v).toUpperCase();

/* =========================================================
   GET /api/clientes
   query: q, activo (0|1), limit, offset
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const q = req.query.q ? clean(req.query.q) : "";
    const activo =
      req.query.activo !== undefined && req.query.activo !== ""
        ? Number(req.query.activo)
        : null;

    const limit = Math.min(
      300,
      Math.max(1, parseInt(req.query.limit || "100", 10)),
    );
    const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

    const where = [];
    const params = [];

    if (activo === 0 || activo === 1) {
      where.push("c.activo = ?");
      params.push(activo);
    }

    if (q) {
      where.push(`
        (
          c.nombre LIKE ?
          OR c.rtn LIKE ?
          OR c.direccion LIKE ?
          OR c.telefono LIKE ?
          OR c.email LIKE ?
          OR CAST(c.id AS CHAR) LIKE ?
        )
      `);
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    const sql = `
      SELECT
        c.id,
        c.nombre,
        c.rtn,
        c.telefono,
        c.direccion,
        c.email,
        c.activo,
        c.created_at,
        c.updated_at
      FROM clientes c
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY c.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await exec(sql, params);
    res.json({ ok: true, data: rows });
  }),
);

/* =========================================================
   POST /api/clientes
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const nombre = clean(req.body?.nombre);
    const rtn = clean(req.body?.rtn) || null;
    const telefono = clean(req.body?.telefono) || null;
    const direccion = clean(req.body?.direccion) || null;
    const email = clean(req.body?.email) || null;

    if (!nombre)
      return res
        .status(400)
        .json({ ok: false, message: "El nombre es obligatorio." });

    // RTN opcional, pero si viene debe ser 13-14 dígitos (acepta guiones)
    if (rtn) {
      const digits = rtn.replace(/\D/g, "");
      if (!(digits.length === 13 || digits.length === 14)) {
        return res
          .status(400)
          .json({ ok: false, message: "RTN inválido (13 o 14 dígitos)." });
      }
    }

    try {
      const [ins] = await exec(
        `
        INSERT INTO clientes (nombre, rtn, telefono, direccion, email, activo)
        VALUES (?, ?, ?, ?, ?, 1)
        `,
        [nombre, rtn, telefono, direccion, email],
      );

      res.status(201).json({ ok: true, id: ins?.insertId });
    } catch (e) {
      if (String(e?.code) === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({
            ok: false,
            message: "RTN duplicado (ya existe un cliente con ese RTN).",
          });
      }
      throw e;
    }
  }),
);

/* =========================================================
   PUT /api/clientes/:id
========================================================= */
router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!isInt(id))
      return res.status(400).json({ ok: false, message: "ID inválido." });

    const nombre = clean(req.body?.nombre);
    const rtn = clean(req.body?.rtn) || null;
    const telefono = clean(req.body?.telefono) || null;
    const direccion = clean(req.body?.direccion) || null;
    const email = clean(req.body?.email) || null;

    if (!nombre)
      return res
        .status(400)
        .json({ ok: false, message: "El nombre es obligatorio." });

    if (rtn) {
      const digits = rtn.replace(/\D/g, "");
      if (!(digits.length === 13 || digits.length === 14)) {
        return res
          .status(400)
          .json({ ok: false, message: "RTN inválido (13 o 14 dígitos)." });
      }
    }

    // existe?
    const [[ex]] = await exec(`SELECT id FROM clientes WHERE id=? LIMIT 1`, [
      id,
    ]);
    if (!ex)
      return res
        .status(404)
        .json({ ok: false, message: "Cliente no encontrado." });

    try {
      await exec(
        `
        UPDATE clientes
        SET nombre=?, rtn=?, telefono=?, direccion=?, email=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        `,
        [nombre, rtn, telefono, direccion, email, id],
      );
      res.json({ ok: true });
    } catch (e) {
      if (String(e?.code) === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({
            ok: false,
            message: "RTN duplicado (ya existe un cliente con ese RTN).",
          });
      }
      throw e;
    }
  }),
);

/* =========================================================
   PATCH /api/clientes/:id/estado
   body: { activo: 0|1 }
========================================================= */
router.patch(
  "/:id/estado",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!isInt(id))
      return res.status(400).json({ ok: false, message: "ID inválido." });

    const activo = Number(req.body?.activo);
    if (!(activo === 0 || activo === 1)) {
      return res
        .status(400)
        .json({ ok: false, message: "activo debe ser 0 o 1." });
    }

    const [[ex]] = await exec(`SELECT id FROM clientes WHERE id=? LIMIT 1`, [
      id,
    ]);
    if (!ex)
      return res
        .status(404)
        .json({ ok: false, message: "Cliente no encontrado." });

    await exec(
      `UPDATE clientes SET activo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [activo, id],
    );

    res.json({ ok: true });
  }),
);

/* =========================================================
   DELETE /api/clientes/:id
   (si tiene facturas, lo ideal es desactivar; pero dejamos delete real)
========================================================= */
router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!isInt(id))
      return res.status(400).json({ ok: false, message: "ID inválido." });

    const [[ex]] = await exec(`SELECT id FROM clientes WHERE id=? LIMIT 1`, [
      id,
    ]);
    if (!ex)
      return res
        .status(404)
        .json({ ok: false, message: "Cliente no encontrado." });

    try {
      await exec(`DELETE FROM clientes WHERE id=?`, [id]);
      res.json({ ok: true });
    } catch (e) {
      // FK constraint
      if (String(e?.code) === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          ok: false,
          message:
            "No se puede eliminar: el cliente está referenciado. Mejor desactívalo.",
        });
      }
      throw e;
    }
  }),
);

export default router;
