import * as dbMod from "./db.js";

const pool = dbMod.default || dbMod.pool || dbMod.connection || dbMod.db;
const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

async function fixCorrelativo() {
  try {
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    console.log(`📅 Revisando órdenes del día: ${hoy}`);
    
    // Buscar todas las órdenes del día
    const [ordenes] = await exec(
      `SELECT id, numero_dia, codigo, estado FROM ordenes WHERE fecha = ? ORDER BY numero_dia DESC`,
      [hoy]
    );
    
    console.log(`📊 Órdenes encontradas: ${ordenes.length}`);
    ordenes.forEach(o => {
      console.log(`  - ID: ${o.id}, Numero: ${o.numero_dia}, Código: ${o.codigo}, Estado: ${o.estado}`);
    });
    
    // Buscar el máximo número_dia
    const maxNumero = ordenes.length > 0 ? Math.max(...ordenes.map(o => o.numero_dia)) : 0;
    console.log(`\n🔢 Número máximo del día: ${maxNumero}`);
    
    // Actualizar el correlativo
    const [corr] = await exec(
      `SELECT ultimo_numero FROM orden_correlativo WHERE fecha = ?`,
      [hoy]
    );
    
    if (corr.length) {
      console.log(`📝 Correlativo actual en BD: ${corr[0].ultimo_numero}`);
      
      if (corr[0].ultimo_numero < maxNumero) {
        await exec(
          `UPDATE orden_correlativo SET ultimo_numero = ? WHERE fecha = ?`,
          [maxNumero, hoy]
        );
        console.log(`✅ Correlativo actualizado de ${corr[0].ultimo_numero} a ${maxNumero}`);
      } else {
        console.log(`✅ Correlativo ya está sincronizado (${corr[0].ultimo_numero})`);
      }
    } else {
      await exec(
        `INSERT INTO orden_correlativo (fecha, ultimo_numero) VALUES (?, ?)`,
        [hoy, maxNumero]
      );
      console.log(`✅ Correlativo creado con valor ${maxNumero}`);
    }
    
    console.log(`\n🎯 Próxima orden será: ${maxNumero + 1}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit(0);
  }
}

fixCorrelativo();
