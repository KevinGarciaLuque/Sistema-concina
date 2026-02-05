import * as dbMod from "../db.js";

const pool =
  (dbMod.default && (dbMod.default.execute || dbMod.default.query) ? dbMod.default : null) ||
  dbMod.pool ||
  dbMod.connection ||
  dbMod.db ||
  null;

if (!pool) throw new Error("DB pool no disponible en db.js");

const exec = (sql, params = []) => (pool.execute ? pool.execute(sql, params) : pool.query(sql, params));

async function getRolIdFromReq(req) {
  // Ideal: que tu auth ya ponga req.user.rol_id
  if (req.user?.rol_id) return Number(req.user.rol_id);

  // Fallback: buscar por usuario_id
  if (!req.user?.id) return null;
  const [[u]] = await exec(`SELECT rol_id FROM usuarios WHERE id = ? LIMIT 1`, [Number(req.user.id)]);
  return u?.rol_id ? Number(u.rol_id) : null;
}

export async function cargarPermisos(req) {
  if (req._permisosSet) return req._permisosSet;

  const rolId = await getRolIdFromReq(req);
  if (!rolId) {
    req._permisosSet = new Set();
    return req._permisosSet;
  }

  const [rows] = await exec(
    `SELECT p.clave
     FROM rol_permisos rp
     INNER JOIN permisos p ON p.id = rp.permiso_id
     WHERE rp.rol_id = ?`,
    [rolId]
  );

  req._permisosSet = new Set(rows.map((r) => String(r.clave)));
  return req._permisosSet;
}

/**
 * ✅ Requiere 1 permiso
 * requirePermiso("FACTURAS.CREAR")
 */
export function requirePermiso(clave) {
  return async (req, res, next) => {
    try {
      const set = await cargarPermisos(req);
      if (set.has(String(clave))) return next();
      return res.status(403).json({ ok: false, message: "No autorizado (permiso requerido).", permiso: clave });
    } catch (e) {
      return next(e);
    }
  };
}

/**
 * ✅ Requiere TODOS los permisos
 * requirePermisos("CAJA.ABRIR","POS.USAR")
 */
export function requirePermisos(...claves) {
  return async (req, res, next) => {
    try {
      const set = await cargarPermisos(req);
      const faltan = claves.filter((c) => !set.has(String(c)));
      if (faltan.length === 0) return next();
      return res.status(403).json({ ok: false, message: "No autorizado (faltan permisos).", faltan });
    } catch (e) {
      return next(e);
    }
  };
}
