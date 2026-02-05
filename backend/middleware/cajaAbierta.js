const dbRaw = require("../db");
const pool = dbRaw?.execute ? dbRaw : dbRaw?.pool || dbRaw;

const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

/**
 * Middleware: exige caja ABIERTA del usuario autenticado.
 * - Adjunta: req.cajaSesion { id, usuario_id, fecha_apertura, monto_apertura, estado }
 * - Adjunta: req.caja_sesion_id
 */
module.exports = async function cajaAbierta(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const [rows] = await exec(
      `SELECT id, usuario_id, fecha_apertura, monto_apertura, estado, fecha_cierre, monto_cierre, created_at
       FROM caja_sesiones
       WHERE usuario_id = ? AND estado = 'ABIERTA'
       ORDER BY id DESC
       LIMIT 1`,
      [Number(userId)]
    );

    if (!rows.length) {
      return res.status(409).json({
        ok: false,
        code: "CAJA_CERRADA",
        message: "No hay caja abierta. Debes abrir caja para continuar.",
      });
    }

    req.cajaSesion = rows[0];
    req.caja_sesion_id = rows[0].id;
    next();
  } catch (e) {
    next(e);
  }
};
