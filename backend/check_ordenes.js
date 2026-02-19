import * as dbMod from "./db.js";

const pool = dbMod.default || dbMod.pool || dbMod.connection || dbMod.db;
const exec = (sql, params = []) =>
  pool.execute ? pool.execute(sql, params) : pool.query(sql, params);

async function checkDuplicates() {
  try {
    // Buscar la orden 0003
    const [ordenes] = await exec(
      `SELECT id, fecha, numero_dia, codigo, estado, created_at FROM ordenes WHERE codigo LIKE 'ORD-20260218-%' ORDER BY numero_dia`
    );
    
    console.log(`📊 Todas las órdenes del 2026-02-18:`);
    ordenes.forEach(o => {
      console.log(`  - ID: ${o.id}, Numero: ${o.numero_dia}, Código: ${o.codigo}, Estado: ${o.estado}, Creada: ${o.created_at}`);
    });
    
    // Buscar duplicados
    const codigos = ordenes.map(o => o.codigo);
    const duplicados = codigos.filter((item, index) => codigos.indexOf(item) !== index);
    
    if (duplicados.length > 0) {
      console.log(`\n⚠️ Códigos duplicados encontrados: ${duplicados.join(', ')}`);
    } else {
      console.log(`\n✅ No hay códigos duplicados`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit(0);
  }
}

checkDuplicates();
