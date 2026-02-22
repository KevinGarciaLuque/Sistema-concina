// Script de diagnóstico para verificar órdenes pendientes
import pool from './db.js';

async function debugOrdenes() {
  try {
    console.log('\n🔍 DIAGNÓSTICO DE ÓRDENES PENDIENTES\n');
    console.log('='.repeat(60));
    
    // 1. Todas las órdenes sin facturar
    const [ordenesSinFacturar] = await pool.execute(`
      SELECT 
        o.id, o.codigo, o.fecha, o.estado, o.tipo, o.mesa,
        o.total, o.created_at,
        f.id AS factura_id
      FROM ordenes o
      LEFT JOIN facturas f ON f.orden_id = o.id
      WHERE f.id IS NULL
      ORDER BY o.id DESC
      LIMIT 20
    `);
    
    console.log(`\n📋 Órdenes sin facturar (últimas 20):`);
    console.table(ordenesSinFacturar.map(o => ({
      codigo: o.codigo,
      fecha: o.fecha,
      estado: o.estado,
      tipo: o.tipo,
      mesa: o.mesa || '-',
      total: `L ${o.total}`,
      created: new Date(o.created_at).toLocaleString('es-HN')
    })));
    
    // 2. Órdenes que deberían aparecer en POS (NO anuladas, sin factura)
    const [ordenesPendientesCobro] = await pool.execute(`
      SELECT 
        o.id, o.codigo, o.fecha, o.estado, o.tipo, o.mesa,
        o.total, o.created_at
      FROM ordenes o
      LEFT JOIN facturas f ON f.orden_id = o.id
      WHERE o.estado != 'ANULADA'
        AND f.id IS NULL
      ORDER BY o.id DESC
      LIMIT 10
    `);
    
    console.log(`\n💰 Órdenes pendientes de cobro (NO anuladas, sin factura):`);
    if (ordenesPendientesCobro.length === 0) {
      console.log('   ❌ NO HAY ÓRDENES PENDIENTES');
    } else {
      console.table(ordenesPendientesCobro.map(o => ({
        codigo: o.codigo,
        fecha: o.fecha,
        estado: o.estado,
        tipo: o.tipo,
        mesa: o.mesa || '-',
        total: `L ${o.total}`,
        created: new Date(o.created_at).toLocaleString('es-HN')
      })));
    }
    
    // 3. Distribución de estados
    const [estadosCount] = await pool.execute(`
      SELECT estado, COUNT(*) as total
      FROM ordenes
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY estado
      ORDER BY total DESC
    `);
    
    console.log(`\n📊 Distribución de estados (últimos 7 días):`);
    console.table(estadosCount);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    process.exit(1);
  }
}

debugOrdenes();
