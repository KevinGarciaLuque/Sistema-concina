import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

/* ===== pool compatible ===== */
const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query)
    ? dbMod.default
    : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("No se pudo obtener el pool de DB desde db.js");

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/* ===== middlewares compatibles ===== */
const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles =
  rolesMod.default ||
  rolesMod.allowRoles ||
  rolesMod.permitirRoles ||
  rolesMod.roles;
if (!requireAuth) throw new Error("No se encontró middleware auth");
if (!allowRoles) throw new Error("No se encontró middleware roles");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ===== helpers ===== */
const onlyDigits = (v, len) =>
  String(v || "")
    .replaceAll(/\D/g, "")
    .slice(0, len);

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

/* =========================================================
   GET /api/cai
========================================================= */
router.get(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const [rows] = await exec(
      "SELECT * FROM cai ORDER BY activo DESC, id DESC",
    );
    res.json({ ok: true, data: rows });
  }),
);

/* =========================================================
   GET /api/cai/activo
========================================================= */
router.get(
  "/activo",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const [[row]] = await exec("SELECT * FROM cai WHERE activo=1 LIMIT 1");
    res.json({ ok: true, data: row || null });
  }),
);

/* =========================================================
   POST /api/cai
   Crea un CAI/rango
========================================================= */
router.post(
  "/",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const {
      cai_codigo,
      establecimiento,
      punto_emision,
      tipo_documento,
      rango_desde,
      rango_hasta,
      fecha_limite,
      correlativo_actual = 0,
      activo = 0,
    } = req.body || {};

    const est = onlyDigits(establecimiento, 3).padStart(3, "0");
    const pto = onlyDigits(punto_emision, 3).padStart(3, "0");
    const tipo = onlyDigits(tipo_documento, 2).padStart(2, "0");

    const rd = asInt(rango_desde);
    const rh = asInt(rango_hasta);
    const ca = asInt(correlativo_actual);

    if (!String(cai_codigo || "").trim())
      return res.status(400).json({ ok: false, message: "Falta cai_codigo" });
    if (est.length !== 3 || pto.length !== 3 || tipo.length !== 2)
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "Formato inválido: establecimiento(3), punto_emision(3), tipo_documento(2)",
        });

    if (
      !Number.isFinite(rd) ||
      !Number.isFinite(rh) ||
      rd <= 0 ||
      rh <= 0 ||
      rd > rh
    )
      return res.status(400).json({ ok: false, message: "Rango inválido" });

    if (!fecha_limite)
      return res.status(400).json({ ok: false, message: "Falta fecha_limite" });
    if (!Number.isFinite(ca) || ca < 0)
      return res
        .status(400)
        .json({ ok: false, message: "correlativo_actual inválido" });

    // si viene activo=1, desactiva el resto
    if (Number(activo) === 1) {
      await exec("UPDATE cai SET activo=0 WHERE activo=1");
    }

    const [r] = await exec(
      `INSERT INTO cai
        (cai_codigo, establecimiento, punto_emision, tipo_documento, rango_desde, rango_hasta, correlativo_actual, fecha_limite, activo)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        String(cai_codigo).trim(),
        est,
        pto,
        tipo,
        rd,
        rh,
        ca,
        fecha_limite,
        Number(activo) === 1 ? 1 : 0,
      ],
    );

    res.json({ ok: true, data: { id: r.insertId } });
  }),
);

/* =========================================================
   PUT /api/cai/:id/activar
   Activa este CAI (solo 1 activo)
========================================================= */
router.put(
  "/:id/activar",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    await exec("UPDATE cai SET activo=0 WHERE activo=1");
    const [r] = await exec("UPDATE cai SET activo=1 WHERE id=?", [id]);

    res.json({ ok: true, data: { updated: r.affectedRows || 0 } });
  }),
);

router.put(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    const {
      cai_codigo,
      establecimiento,
      punto_emision,
      tipo_documento,
      rango_desde,
      rango_hasta,
      correlativo_actual,
      fecha_limite,
      activo,
    } = req.body || {};

    // Validación mínima (lo mismo que en POST)
    if (!String(cai_codigo || "").trim())
      return res.status(400).json({ ok: false, message: "Falta cai_codigo" });
    if (!fecha_limite)
      return res.status(400).json({ ok: false, message: "Falta fecha_limite" });

    const est = String(establecimiento || "")
      .replaceAll(/\D/g, "")
      .slice(0, 3)
      .padStart(3, "0");
    const pto = String(punto_emision || "")
      .replaceAll(/\D/g, "")
      .slice(0, 3)
      .padStart(3, "0");
    const tipo = String(tipo_documento || "")
      .replaceAll(/\D/g, "")
      .slice(0, 2)
      .padStart(2, "0");

    const rd = Number(rango_desde);
    const rh = Number(rango_hasta);
    const ca = Number(correlativo_actual);

    if (
      !Number.isFinite(rd) ||
      !Number.isFinite(rh) ||
      rd <= 0 ||
      rh <= 0 ||
      rd > rh
    )
      return res.status(400).json({ ok: false, message: "Rango inválido" });

    if (!Number.isFinite(ca) || ca < 0)
      return res
        .status(400)
        .json({ ok: false, message: "correlativo_actual inválido" });

    // Si lo ponen activo, apaga los demás
    if (Number(activo) === 1) {
      await exec("UPDATE cai SET activo=0 WHERE activo=1 AND id<>?", [id]);
    }

    const [r] = await exec(
      `UPDATE cai
       SET cai_codigo=?, establecimiento=?, punto_emision=?, tipo_documento=?,
           rango_desde=?, rango_hasta=?, correlativo_actual=?, fecha_limite=?, activo=?
       WHERE id=?`,
      [
        String(cai_codigo).trim(),
        est,
        pto,
        tipo,
        rd,
        rh,
        ca,
        fecha_limite,
        Number(activo) === 1 ? 1 : 0,
        id,
      ],
    );

    res.json({ ok: true, data: { updated: r.affectedRows || 0 } });
  }),
);


/* =========================================================
   GET /api/cai/stock
   Stock disponible del CAI activo (para Dashboard/alert)
========================================================= */
router.get(
  "/stock",
  requireAuth,
  allowRoles("admin", "supervisor", "cajero"),
  asyncHandler(async (req, res) => {
    const [[c]] = await exec("SELECT * FROM cai WHERE activo=1 LIMIT 1");
    if (!c) return res.json({ ok: true, data: null });

    const next = Number(c.correlativo_actual || 0) + 1;
    const restante = Number(c.rango_hasta) - (next - 1);

    res.json({
      ok: true,
      data: {
        cai_id: c.id,
        cai_codigo: c.cai_codigo,
        fecha_limite: c.fecha_limite,
        next_correlativo: next,
        rango_hasta: c.rango_hasta,
        restante: Math.max(0, restante),
      },
    });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  allowRoles("admin", "supervisor"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    // si ya existe alguna factura con ese cai_id, NO borrar
    const [[use]] = await exec(
      "SELECT COUNT(*) AS c FROM facturas WHERE cai_id=? LIMIT 1",
      [id],
    );
    if (Number(use?.c || 0) > 0) {
      return res.status(409).json({
        ok: false,
        message: "No se puede eliminar: este CAI ya fue usado en facturas.",
      });
    }

    const [r] = await exec("DELETE FROM cai WHERE id=?", [id]);
    res.json({ ok: true, data: { deleted: r.affectedRows || 0 } });
  }),
);


export default router;
