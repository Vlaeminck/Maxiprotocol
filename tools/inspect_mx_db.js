const { execSync } = require('child_process');

console.log('=== INSPECCIONANDO BASE DE DATOS mx_27366 ===\n');

try {
  const cmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 127.0.0.1 -P 3399 -u root mx_27366 -e "SHOW TABLES LIKE 'mx%';"`;
  const out = execSync(cmd, { encoding: 'utf8' });
  const tables = out.trim().split('\n').slice(1).map(t => t.trim());
  console.log(`Total tablas en mx_27366: ${tables.length}`);
  console.log('Todas las tablas:', tables.join(', '));

  // Buscar tablas relacionadas con mesas, mozos, comandas, pedidos, ventas, articulos
  const keywords = ['mesa', 'moz', 'com', 'ped', 'ven', 'art', 'caj', 'cli', 'sec'];
  const matched = tables.filter(t => keywords.some(k => t.toLowerCase().includes(k)));
  console.log('\nTablas operativas de interés gastronómico:', matched);

  // Ver estructura y conteo de filas en las tablas clave
  for (const t of matched.slice(0, 15)) {
    try {
      const count = execSync(`C:\\Servidor_MariaDB\\bin\\mysql.exe -h 127.0.0.1 -P 3399 -u root mx_27366 -e "SELECT count(*) as total FROM ${t};"`, { encoding: 'utf8' });
      const total = count.trim().split('\n')[1].trim();
      console.log(`  * Tabla ${t}: ${total} filas`);
    } catch (e) {}
  }
} catch (e) {
  console.error('Error:', e.message);
}
