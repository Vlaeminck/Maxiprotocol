const fs = require('fs');
const path = require('path');

function search(dir, depth = 0) {
  if (depth > 4) return;
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (!f.startsWith('.') && f !== 'Windows' && f !== '$Recycle.Bin' && f !== 'node_modules') {
            search(full, depth + 1);
          }
        } else if (f.endsWith('.sql') || f.endsWith('.bat') || f.endsWith('.cmd') || f.endsWith('.vbs') || f.endsWith('.ps1') || f.endsWith('.txt') || f.endsWith('.ini')) {
          const content = fs.readFileSync(full, 'latin1');
          if (content.includes('27366') || content.includes('10783') || content.includes('C1B7F8B9') || content.includes('GRANT ALL') || content.includes('IDENTIFIED BY')) {
            console.log(`[MATCH] ${full}`);
            const lines = content.split('\n');
            lines.forEach((l, idx) => {
              if (l.includes('27366') || l.includes('10783') || l.includes('C1B7F8B9') || l.includes('IDENTIFIED BY') || l.includes('GRANT ALL')) {
                console.log(`  L${idx + 1}: ${l.trim()}`);
              }
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log('Searching C:\\Servidor_MariaDB, C:\\MaxiREST_SQL, C:\\MaxiRest, C:\\MaxiADMIN...');
search('C:\\Servidor_MariaDB');
search('C:\\MaxiREST_SQL');
search('C:\\MaxiRest');
search('C:\\MaxiADMIN');
