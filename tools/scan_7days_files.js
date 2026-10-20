const fs = require('fs');
const path = require('path');

const roots = [
  'C:\\Users\\Gardenias\\Desktop',
  'C:\\Users\\Gardenias\\Downloads',
  'C:\\Users\\Gardenias\\Documents',
  'C:\\MaxiRest',
  'C:\\MaxiREST_SQL',
  'C:\\MaxiBack',
  'C:\\MaxiADMIN'
];

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
console.log('Searching files modified in last 7 days in roots...');

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  try {
    const items = fs.readdirSync(root);
    for (const item of items) {
      try {
        const full = path.join(root, item);
        const stat = fs.statSync(full);
        if (stat.isFile() && stat.mtime >= sevenDaysAgo) {
          const ext = path.extname(item).toLowerCase();
          if (['.xls', '.xlsx', '.csv', '.dbf', '.txt', '.pdf', '.rep'].includes(ext)) {
            console.log(`[${stat.mtime.toISOString()}] ${full} (${stat.size} bytes)`);
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
}
