import express from "express";
import * as dbMod from "../db.js";
import * as authMod from "../middleware/auth.js";
import * as rolesMod from "../middleware/roles.js";

const router = express.Router();

const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");
const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

const requireAuth = authMod.default || authMod.requireAuth || authMod.auth;
const allowRoles = rolesMod.default || rolesMod.allowRoles || rolesMod.permitirRoles || rolesMod.roles;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isInt = (v) => Number.isInteger(Number(v));

function getIO(req) {
  try { return req.app.get("io") || null; } catch { return null; }
}

/**
 * GET /api/roles-permisos/:rolId
 * devuelve: permisos + assigned (true/false)
 */
router.get(
  "/:rolId",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { rolId } = req.params;
    if (!isInt(rolId)) return res.status(400).json({ ok: false, message: "rolId inválido." });

    const [rol] = await exec(`SELECT id, nombre FROM roles WHERE id=?`, [Number(rolId)]);
    if (!rol.length) return res.status(404).json({ ok: false, message: "Rol no encontrado." });

    const [rows] = await exec(
      `
      SELECT
        p.id, p.clave, p.modulo, p.descripcion,
        CASE WHEN rp.rol_id IS NULL THEN 0 ELSE 1 END AS assigned
      FROM permisos p
      LEFT JOIN rol_permisos rp
        ON rp.permiso_id = p.id AND rp.rol_id = ?
      ORDER BY p.modulo ASC, p.clave ASC
      `,
      [Number(rolId)]
    );

    res.json({ ok: true, data: { rol: rol[0], permisos: rows } });
  })
);

/**
 * PUT /api/roles-permisos/:rolId
 * body: { permisos: ["POS.USAR","FACTURAS.CREAR"] }  (reemplaza todo)
 */
router.put(
  "/:rolId",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { rolId } = req.params;
    if (!isInt(rolId)) return res.status(400).json({ ok: false, message: "rolId inválido." });

    const permisos = Array.isArray(req.body?.permisos) ? req.body.permisos : [];
    const claves = permisos.map((x) => String(x).trim().toUpperCase()).filter(Boolean);

    // valida rol
    const [rol] = await exec(`SELECT id FROM roles WHERE id=?`, [Number(rolId)]);
    if (!rol.length) return res.status(404).json({ ok: false, message: "Rol no encontrado." });

    // valida permisos existentes
    let permisoIds = [];
    if (claves.length) {
      const [pRows] = await exec(
        `SELECT id, clave FROM permisos WHERE clave IN (${claves.map(() => "?").join(",")})`,
        claves
      );
      permisoIds = pRows.map((p) => Number(p.id));
      if (permisoIds.length !== claves.length) {
        const existentes = new Set(pRows.map((p) => p.clave));
        const faltan = claves.filter((c) => !existentes.has(c));
        return res.status(409).json({ ok: false, message: "Algunos permisos no existen.", faltan });
      }
    }

    // transacción (si el pool soporta getConnection)
    if (!pool.getConnection) {
      return res.status(500).json({ ok: false, message: "Pool sin soporte de transacciones (getConnection)." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`DELETE FROM rol_permisos WHERE rol_id=?`, [Number(rolId)]);

      for (const pid of permisoIds) {
        await conn.execute(
          `INSERT INTO rol_permisos (rol_id, permiso_id) VALUES (?, ?)`,
          [Number(rolId), Number(pid)]
        );
      }

      await conn.commit();

      const io = getIO(req);
      if (io) io.to("admin").emit("roles_permisos:update", { rol_id: Number(rolId) });

      res.json({ ok: true });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  })
);

export default router;
