const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== BUSCANDO PROCESOS Y ARCHIVOS MODIFICADOS HOY (12/10/2026) ===\n');

// 1. Procesos en ejecución
console.log('--- 1. Procesos de Maxirest en ejecución ---');
try {
  const tasklist = execSync('tasklist /V /FO CSV', { encoding: 'utf8' });
  tasklist.split('\n').forEach(row => {
    const low = row.toLowerCase();
    if (low.includes('maxi') || low.includes('maria') || low.includes('mysql') || low.includes('pos') || low.includes('delphi') || low.includes('caja')) {
      console.log('PROCESO:', row.trim());
    }
  });
} catch (e) {
  console.log('Error tasklist:', e.message);
}

// 2. Buscar archivos modificados en los últimos 2 días en C:\MaxiREST_SQL, C:\MaxiRest, C:\Servidor_MariaDB, etc.
console.log('\n--- 2. Archivos modificados recientemente (últimas 24h) ---');
const dirsToScan = [
  'C:\\MaxiREST_SQL',
  'C:\\MaxiRest',
  'C:\\Servidor_MariaDB',
  'C:\\MaxiADMIN',
  'C:\\Users\\Gardenias\\AppData\\Local\\VirtualStore'
];

const now = Date.now();
const oneDayAgo = now - (48 * 3600 * 1000);

dirsToScan.forEach(base => {
  if (!fs.existsSync(base)) return;
  console.log(`\nEscaneando ${base}...`);
  try {
    const items = fs.readdirSync(base, { recursive: true });
    let countRecent = 0;
    items.forEach(it => {
      try {
        const full = path.join(base, it);
        const st = fs.statSync(full);
        if (!st.isDirectory() && st.mtimeMs > oneDayAgo) {
          countRecent++;
          const ageHours = ((now - st.mtimeMs) / (3600 * 1000)).toFixed(1);
          console.log(`  [MODIFICADO HACE ${ageHours}h] ${full} (${st.size} bytes)`);
        }
      } catch (e) {}
    });
    if (countRecent === 0) console.log('  (Sin archivos modificados recientemente)');
  } catch (e) {
    console.log(`Error escaneando ${base}:`, e.message);
  }
});
