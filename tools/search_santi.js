const fs = require('fs');
const path = require('path');

const queries = ['SANTI', '01/10/2026', '20261001', '20251001'];
const dirs = ['C:\\MaxiREST_SQL', 'C:\\Servidor_MariaDB', 'C:\\MaxiADMIN', 'C:\\MaxiBack', 'C:\\MaxiRest'];

for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  console.log('Searching in:', d);
  function scan(currentDir) {
    let list = [];
    try { list = fs.readdirSync(currentDir); } catch(e) { return; }
    for (const item of list) {
      const full = path.join(currentDir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scan(full);
        } else if (stat.isFile() && stat.size < 50000000 && !item.toLowerCase().endsWith('.exe') && !item.toLowerCase().endsWith('.dll')) {
          const buf = fs.readFileSync(full);
          for (const q of queries) {
            if (buf.includes(Buffer.from(q))) {
              console.log(`Found "${q}" in: ${full} (${stat.size} bytes)`);
              break;
            }
          }
        }
      } catch(e) {}
    }
  }
  scan(d);
}
