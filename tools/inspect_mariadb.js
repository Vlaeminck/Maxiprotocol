const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== INSPECCIÓN DE SERVIDOR_MARIADB ===\n');

const mariaDir = 'C:\\Servidor_MariaDB';
if (fs.existsSync(mariaDir)) {
  console.log(`[+] Encontrado: ${mariaDir}`);
  const items = fs.readdirSync(mariaDir);
  console.log('Contenido raíz:', items);

  // Buscar my.ini o my.cnf
  ['my.ini', 'my.cnf'].forEach(cfg => {
    const p = path.join(mariaDir, cfg);
    if (fs.existsSync(p)) {
      console.log(`\n>>> Archivo de configuración: ${cfg}`);
      console.log(fs.readFileSync(p, 'utf8'));
    }
  });

  // Revisar carpeta data
  const dataDir = path.join(mariaDir, 'data');
  if (fs.existsSync(dataDir)) {
    console.log('\nDirectorio de datos (data/):');
    try {
      const dataItems = fs.readdirSync(dataDir);
      console.log('Bases de datos encontradas:', dataItems);
    } catch (e) {
      console.log('Error leyendo data:', e.message);
    }
  }
} else {
  console.log('[-] C:\\Servidor_MariaDB no existe.');
}

// Chequear servicios y puertos MariaDB / MySQL
console.log('\n--- Buscando servicios de MySQL / MariaDB ---');
try {
  const scOut = execSync('sc query state= all', { encoding: 'utf8' });
  scOut.split('\n').forEach(l => {
    const low = l.toLowerCase();
    if (low.includes('mariadb') || low.includes('mysql') || low.includes('maxi')) {
      console.log(`  Servicio: ${l.trim()}`);
    }
  });
} catch (e) {}

// Chequear netstat para 3306, 3366, 3399
console.log('\n--- Puertos de MariaDB / MySQL (3306, 3366, 3399) ---');
try {
  const ns = execSync('netstat -ano | findstr "LISTENING" | findstr ":33"', { encoding: 'utf8' });
  console.log(ns);
} catch (e) {
  console.log('No hay puertos 33xx escuchando.');
}
