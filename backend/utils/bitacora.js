async function registrarBitacora(db, payload) {
    try {
      const pool = db?.execute ? db : db?.pool || db;
      const exec = (sql, params = []) =>
        pool.execute ? pool.execute(sql, params) : pool.query(sql, params);
  
      const {
        usuario_id = null,
        accion,
        entidad,
        entidad_id = null,
        detalle = null,
        ip = null,
      } = payload;
  
      await exec(
        `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle, ip)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuario_id, accion, entidad, entidad_id, detalle, ip]
      );
    } catch {
      // Bitácora nunca debe tumbar el request
    }
  }
  
  function getIp(req) {
    const xf = req.headers["x-forwarded-for"];
    return (Array.isArray(xf) ? xf[0] : xf)?.split(",")[0]?.trim() || req.ip || null;
  }
  
  module.exports = { registrarBitacora, getIp };
  