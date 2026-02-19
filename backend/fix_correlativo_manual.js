import * as dbMod from "./db.js";

const pool = dbMod.default || dbMod.pool || dbMod.connection || dbMod.db;
const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

async function fixCorrelativo() {
  try {
    const fecha = '2026-02-18';
    const nuevoCorrelativo = 17;
    
    console.log(`📅 Actualizando correlativo para: ${fecha}`);
    
    // Actualizar o insertar el correlativo
    const [existe] = await exec(
      `SELECT ultimo_numero FROM orden_correlativo WHERE fecha = ?`,
      [fecha]
    );
    
    if (existe.length) {
      await exec(
        `UPDATE orden_correlativo SET ultimo_numero = ? WHERE fecha = ?`,
        [nuevoCorrelativo, fecha]
      );
      console.log(`✅ Correlativo actualizado de ${existe[0].ultimo_numero} a ${nuevoCorrelativo}`);
    } else {
      await exec(
        `INSERT INTO orden_correlativo (fecha, ultimo_numero) VALUES (?, ?)`,
        [fecha, nuevoCorrelativo]
      );
      console.log(`✅ Correlativo creado con valor ${nuevoCorrelativo}`);
    }
    
    console.log(`\n🎯 Próxima orden será: ORD-20260218-${String(nuevoCorrelativo + 1).padStart(4, '0')}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit(0);
  }
}

fixCorrelativo();
