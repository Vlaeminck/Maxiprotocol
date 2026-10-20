const fs = require('fs');
const path = require('path');

const searchDirs = [
  'C:\\MaxiRest',
  'C:\\MaxiREST_SQL',
  'C:\\MaxiBack',
  'C:\\MaxiADMIN',
  'C:\\Users\\Gardenias\\Desktop',
  'C:\\Users\\Gardenias\\Downloads',
  'C:\\Users\\Gardenias\\Documents'
];

console.log('Searching for DBF, XLS, CSV, TXT, PRF files modified in last 48 hours...');
const since = new Date(Date.now() - 48 * 3600 * 1000);

for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) continue;
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      try {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isFile() && stat.mtime >= since) {
          const ext = path.extname(f).toLowerCase();
          if (['.dbf', '.xls', '.xlsx', '.csv', '.txt', '.prf', '.rep', '.frx', '.tmp'].includes(ext)) {
            console.log(`[${stat.mtime.toLocaleTimeString()} ${stat.mtime.toLocaleDateString()}] ${full} (${stat.size} bytes)`);
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
}
