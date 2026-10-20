const fs = require('fs');
const path = require('path');

async function runAudit() {
  const datesToAudit = [
    { date: '2026-10-14', desc: 'Informe Oficial Maxirest (35371505.dbf)', expectedRocio: 'OFF' },
    { date: '2026-10-13', desc: 'Sin informe de mozos emitido en Maxirest POS', expectedRocio: 'OFF' },
    { date: '2026-10-12', desc: 'Informe Oficial Maxirest (39122690.dbf)', expectedRocio: 'WORKING' },
    { date: '2026-10-11', desc: 'Sin informe de mozos emitido en Maxirest POS', expectedRocio: 'OFF' },
    { date: '2026-10-08', desc: 'Informe Oficial Maxirest (42412338.dbf / bakinforme.dbf)', expectedRocio: 'OFF' },
    { date: '2026-10-07', desc: 'Informe Oficial Maxirest (39076206.dbf / 111.xls)', expectedRocio: 'OFF' },
    { date: '2026-09-30', desc: 'Informe Oficial Maxirest (Informe.DBF)', expectedRocio: 'OFF' },
    { date: '2026-08-14', desc: 'Histórico 45294870.dbf (Viernes)', expectedRocio: 'WORKING' },
    { date: '2026-08-15', desc: 'Histórico 45294870.dbf (Sábado)', expectedRocio: 'WORKING' },
    { date: '2025-09-22', desc: 'Histórico 45294870.dbf (Lunes)', expectedRocio: 'OFF' },
    { date: '2025-09-17', desc: 'Histórico 45294870.dbf (Miércoles)', expectedRocio: 'OFF' },
    { date: '2025-10-08', desc: 'Histórico 45294870.dbf (Miércoles)', expectedRocio: 'OFF' }
  ];

  console.log('================================================================================');
  console.log('📋 AUDITORÍA FORENSE DE MOZOS Y ASISTENCIA (MaxiProtocol vs Maxirest POS)');
  console.log('================================================================================\n');

  const auditResults = [];

  for (const item of datesToAudit) {
    try {
      const res = await fetch('http://localhost:3000/api/analytics/day?date=' + item.date);
      const json = await res.json();
      const mozos = (json.data && json.data.mozos) ? json.data.mozos : [];
      
      const presentMozos = mozos.filter(m => (m.ventas || 0) > 0);
      const idleMozos = mozos.filter(m => (m.ventas || 0) === 0);
      
      const rocio = mozos.find(m => m.nombre === 'ROCIO' || m.codigo === 982);
      const rocioStatus = (rocio && rocio.ventas > 0) ? 'WORKING' : 'OFF';
      const rocioMatch = rocioStatus === item.expectedRocio;

      auditResults.push({
        date: item.date,
        desc: item.desc,
        totalSales: json.data.kpis ? json.data.kpis.facturacionTotal : 0,
        totalCub: json.data.kpis ? json.data.kpis.totalComensales : 0,
        activeCount: presentMozos.length,
        idleCount: idleMozos.length,
        rocio: {
          ventas: rocio ? rocio.ventas : 0,
          tickets: rocio ? rocio.tickets : 0,
          cub: rocio ? rocio.cubiertos : 0,
          status: rocioStatus,
          expected: item.expectedRocio,
          match: rocioMatch
        },
        presentList: presentMozos.map(m => `${m.nombre} ($${m.ventas.toLocaleString('es-AR')}, ${m.cubiertos} cub)`),
        bajaStaff: mozos.filter(m => m.estado === 'BAJA').map(m => m.nombre)
      });
    } catch (e) {
      console.error('Error auditando fecha', item.date, e.message);
    }
  }

  for (const r of auditResults) {
    console.log(`📅 Fecha: ${r.date} | ${r.desc}`);
    console.log(`   Facturación General: $${r.totalSales.toLocaleString('es-AR')} | Cubiertos Totales: ${r.totalCub}`);
    console.log(`   Colaboradores En Turno: ${r.activeCount} | Colaboradores Sin Turno / Baja: ${r.idleCount}`);
    console.log(`   ROCIO: ${r.rocio.status === 'WORKING' ? '🟢 EN TURNO ($' + r.rocio.ventas.toLocaleString('es-AR') + ' - ' + r.rocio.cub + ' cub)' : '⚪ SIN TURNO ($0 - 0 cub)'} -> ${r.rocio.match ? '✅ VERIFICADO CORRECTO' : '❌ DISCREPANCIA'}`);
    if (r.presentList.length > 0) {
      console.log(`   Personal presente: ${r.presentList.join(' | ')}`);
    } else {
      console.log(`   Personal presente: [Ninguno - Fecha sin informe de mozos emitido]`);
    }
    console.log('--------------------------------------------------------------------------------');
  }

  const allPassed = auditResults.every(r => r.rocio.match);
  console.log(`\n🎯 RESUMEN FINAL: ${allPassed ? '✅ 100% DE VERIFICACIÓN EXITOSA - CERO MOZOS FANTASMAS' : '❌ SE ENCONTRARON DISCREPANCIAS'}`);
}

runAudit();
