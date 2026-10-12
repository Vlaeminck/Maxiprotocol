const fs = require('fs');

console.log('=== LEYENDO C:\\MaxiREST_SQL\\Log\\ErrorSql.log (Últimas líneas) ===\n');
try {
  const p = 'C:\\MaxiREST_SQL\\Log\\ErrorSql.log';
  const content = fs.readFileSync(p, 'latin1');
  const lines = content.split('\n');
  console.log(`Total líneas: ${lines.length}`);
  console.log(lines.slice(-60).join('\n'));
} catch (e) {
  console.log('Error:', e.message);
}
