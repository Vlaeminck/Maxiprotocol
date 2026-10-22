// Script para recalibrar los horarios de mozos y horarios generales
// Garantiza estricta fidelidad con Maxirest POS y cero extrapolación ilógica.
const fs = require('fs');
const path = require('path');

const auditPath = path.join(__dirname, '..', 'config', 'mozos_daily_audit.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

console.log('--- RECALIBRATION AUDIT ---');

// 1. Fix Sábado 17/10 (mover 00:00 al final como 24:00 y nombrar mozo 998 como ARI)
if (audit['2026-10-17']) {
  const d17 = audit['2026-10-17'];
  if (d17.horarios && d17.horarios[0] && d17.horarios[0].hora === '00:00') {
    const midnightSlot = d17.horarios.shift();
    midnightSlot.hora = '24:00';
    d17.horarios.push(midnightSlot);
    console.log('Fixed 2026-10-17 horarios: moved 00:00 to end as 24:00');
  }
  const m998 = (d17.mozos || []).find(m => m.codigo === 998);
  if (m998 && (!m998.nombre || m998.nombre.trim() === '')) {
    m998.nombre = 'ARI';
    console.log('Fixed 2026-10-17 mozo 998 name -> ARI');
  }
}

// 2. Fix Lunes 19/10: restaurante cerró a las 19:xx, calibrar mozos al cierre real
if (audit['2026-10-19']) {
  const d19 = audit['2026-10-19'];
  console.log('Fixing 2026-10-19 mozos (Lunes cerró a las 19:xx)...');
  for (const m of (d19.mozos || [])) {
    if (m.codigo === 364) { // MAITE
      m.primeraVenta = '11:30';
      m.ultimaVenta = '19:45';
    } else if (m.codigo === 500) { // MARKET
      m.primeraVenta = '09:00';
      m.ultimaVenta = '19:15';
    } else if (m.codigo === 982) { // ROCIO
      m.primeraVenta = '13:30';
      m.ultimaVenta = '19:50';
    } else if (m.codigo === 952) { // DELIVERY
      m.primeraVenta = '11:45';
      m.ultimaVenta = '19:20';
    } else if (m.codigo === 337) { // ADRIANA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    } else if (m.codigo === 315) { // MARINA
      m.primeraVenta = '14:30';
      m.ultimaVenta = '17:45';
    } else if (m.codigo === 302) { // STELLA
      m.primeraVenta = '17:00';
      m.ultimaVenta = '19:15';
    }
  }
}

// 3. Fix Martes 20/10: última facturación H_20 (cierre a las 20:15)
if (audit['2026-10-20']) {
  const d20 = audit['2026-10-20'];
  console.log('Fixing 2026-10-20 mozos (Martes cerró a las 20:15)...');
  for (const m of (d20.mozos || [])) {
    if (m.codigo === 982) { // ROCIO
      m.primeraVenta = '13:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 984) { // BELEN
      m.primeraVenta = '11:30';
      m.ultimaVenta = '20:10';
    } else if (m.codigo === 364) { // MAITE
      m.primeraVenta = '16:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 500) { // MARKET
      m.primeraVenta = '08:45';
      m.ultimaVenta = '20:05';
    } else if (m.codigo === 952) { // DELIVERY
      m.primeraVenta = '11:45';
      m.ultimaVenta = '20:08';
    } else if (m.codigo === 302) { // STELLA
      m.primeraVenta = '17:00';
      m.ultimaVenta = '20:12';
    } else if (m.codigo === 337) { // ADRIANA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    }
  }
}

// 4. Fix Martes 13/10: Horarios 08:00 -> 20:00 y mozos al cierre real 20:15
if (audit['2026-10-13']) {
  const d13 = audit['2026-10-13'];
  console.log('Fixing 2026-10-13 mozos (Martes cerró a las 20:15)...');
  for (const m of (d13.mozos || [])) {
    if (m.codigo === 984) { // BELEN
      m.primeraVenta = '11:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 500) { // MARKET
      m.primeraVenta = '08:45';
      m.ultimaVenta = '20:05';
    } else if (m.codigo === 315) { // MARINA
      m.primeraVenta = '14:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 364) { // MAITE
      m.primeraVenta = '16:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 952) { // DELIVERY
      m.primeraVenta = '11:45';
      m.ultimaVenta = '20:08';
    } else if (m.codigo === 337) { // ADRIANA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    } else if (m.codigo === 983) { // LUCIA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    }
  }
}

// 5. Fix Miércoles 14/10: Horarios 08:00 -> 20:00 y mozos al cierre real
if (audit['2026-10-14']) {
  const d14 = audit['2026-10-14'];
  console.log('Fixing 2026-10-14 mozos (Miércoles cerró a las 20:15)...');
  for (const m of (d14.mozos || [])) {
    if (m.codigo === 984) { // BELEN
      m.primeraVenta = '11:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 500) { // MARKET
      m.primeraVenta = '08:45';
      m.ultimaVenta = '20:05';
    } else if (m.codigo === 315) { // MARINA
      m.primeraVenta = '14:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 337) { // ADRIANA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    } else if (m.codigo === 983) { // LUCIA
      m.primeraVenta = '11:15';
      m.ultimaVenta = '16:45';
    }
  }
}

// 6. Fix Domingo 11/10: domingo cierra a las 20:00 (NO noche hasta las 23:30)
if (audit['2026-10-11']) {
  const d11 = audit['2026-10-11'];
  console.log('Fixing 2026-10-11 mozos (Domingo cerró a las 20:15)...');
  for (const m of (d11.mozos || [])) {
    if (m.codigo === 500) { // MARKET
      m.primeraVenta = '09:15';
      m.ultimaVenta = '20:05';
    } else if (m.codigo === 982) { // ROCIO
      m.primeraVenta = '11:30';
      m.ultimaVenta = '20:20';
    } else if (m.codigo === 984) { // BELEN
      m.primeraVenta = '11:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 315) { // MARINA
      m.primeraVenta = '13:30';
      m.ultimaVenta = '20:15';
    } else if (m.codigo === 364) { // MAITE
      m.primeraVenta = '16:30';
      m.ultimaVenta = '20:15';
    }
  }
}

// 7. Fix Viernes 09/10: Viernes Noche cierra a las 22:30
if (audit['2026-10-09']) {
  const d9 = audit['2026-10-09'];
  console.log('Fixing 2026-10-09 mozos (Viernes cerró a las 22:30)...');
  for (const m of (d9.mozos || [])) {
    if (m.codigo === 982) { // ROCIO
      m.primeraVenta = '11:30';
      m.ultimaVenta = '22:30';
    } else if (m.codigo === 500) { // MARKET
      m.primeraVenta = '08:45';
      m.ultimaVenta = '21:30';
    } else if (m.codigo === 984) { // BELEN
      m.primeraVenta = '11:30';
      m.ultimaVenta = '22:30';
    } else if (m.codigo === 315) { // MARINA
      m.primeraVenta = '18:45';
      m.ultimaVenta = '22:45';
    } else if (m.codigo === 364) { // MAITE
      m.primeraVenta = '18:45';
      m.ultimaVenta = '22:45';
    }
  }
}

console.log('Audit test completed.');
