const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== EXPLORACIÓN PROFUNDA DE MAXIREST Y SISTEMA ===\n');

// 1. Explorar C:\MaxiRest
const maxirestDir = 'C:\\MaxiRest';
if (fs.existsSync(maxirestDir)) {
  console.log(`[+] Directorio detectado: ${maxirestDir}`);
  try {
    const items = fs.readdirSync(maxirestDir);
    console.log(`Contenido de ${maxirestDir}: (${items.length} elementos)`);
    items.forEach(it => {
      try {
        const full = path.join(maxirestDir, it);
        const st = fs.statSync(full);
        console.log(`  - ${st.isDirectory() ? '[DIR] ' : '[FILE]'} ${it} (${st.size} bytes)`);
      } catch (e) {
        console.log(`  - [?] ${it}`);
      }
    });
  } catch (err) {
    console.error('Error leyendo C:\\MaxiRest:', err.message);
  }
} else {
  console.log('[-] C:\\MaxiRest no existe.');
}

// 2. Buscar recursivamente archivos .fdb, .gdb, .ini, .cfg, .exe en C:\MaxiRest
console.log('\n--- Búsqueda recursiva en C:\\MaxiRest ---');
function scanRecursive(dir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanRecursive(fullPath, maxDepth, currentDepth + 1);
      } else {
        const ext = path.extname(ent.name).toLowerCase();
        if (['.fdb', '.gdb', '.ini', '.conf', '.cfg', '.exe', '.bat'].includes(ext) || ent.name.toLowerCase().includes('maxi') || ent.name.toLowerCase().includes('firebird')) {
          const st = fs.statSync(fullPath);
          console.log(`  ${fullPath} (${(st.size / 1024).toFixed(1)} KB)`);
        }
      }
    }
  } catch (err) {
    // console.log(`  Permiso denegado en ${dir}`);
  }
}

if (fs.existsSync(maxirestDir)) {
  scanRecursive(maxirestDir);
}

// 3. Revisar otros discos o rutas comunes
console.log('\n--- Chequeo de otras rutas de programas y datos ---');
const otrasRutas = [
  'C:\\Archivos de programa\\MaxiRest',
  'C:\\Archivos de programa (x86)\\MaxiRest',
  'C:\\Program Files\\MaxiRest',
  'C:\\Program Files (x86)\\MaxiRest',
  'C:\\ProgramData\\MaxiRest',
  'C:\\ProgramData\\Maxi Sistemas',
  'C:\\Maxi Sistemas',
  'C:\\MaxiSistemas',
  'D:\\MaxiRest',
  'D:\\Maxirest'
];

otrasRutas.forEach(r => {
  if (fs.existsSync(r)) {
    console.log(`[+] Encontrado: ${r}`);
    scanRecursive(r, 2);
  }
});

// 4. Chequear servicios de Windows
console.log('\n--- Servicios Windows relacionados con Firebird / Maxi ---');
try {
  const scOut = execSync('sc query state= all', { encoding: 'utf8' });
  const lines = scOut.split('\n');
  let currentService = '';
  lines.forEach(l => {
    if (l.includes('SERVICE_NAME:')) currentService = l.trim();
    if (l.toLowerCase().includes('firebird') || l.toLowerCase().includes('maxi') || l.toLowerCase().includes('interbase')) {
      console.log(`  ${currentService} | ${l.trim()}`);
    }
  });
} catch (e) {
  console.log('Error consultando sc:', e.message);
}

// 5. Chequear procesos corriendo
console.log('\n--- Procesos en ejecución relacionados con Maxirest / Firebird ---');
try {
  const tasklist = execSync('tasklist /V /FO CSV', { encoding: 'utf8' });
  tasklist.split('\n').forEach(row => {
    const low = row.toLowerCase();
    if (low.includes('maxi') || low.includes('firebird') || low.includes('fbserver') || low.includes('fbguard') || low.includes('ibserver')) {
      console.log(`  Proceso: ${row.trim()}`);
    }
  });
} catch (e) {}

// 6. Chequear puertos escuchando (netstat)
console.log('\n--- Puertos escuchando (3050, etc) ---');
try {
  const netstat = execSync('netstat -ano | findstr "3050"', { encoding: 'utf8' });
  console.log('  Netstat 3050:', netstat.trim());
} catch (e) {
  console.log('  Puerto 3050 no tiene listeners activos.');
}
