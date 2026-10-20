const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\Users\\Gardenias\\Desktop',
  'C:\\Users\\Gardenias\\Downloads',
  'C:\\Users\\Gardenias\\Documents',
  'C:\\MaxiRest'
];

for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  const files = fs.readdirSync(d);
  for (const f of files) {
    if (f.endsWith('.xls') || f.endsWith('.xlsx') || f.endsWith('.csv')) {
      const full = path.join(d, f);
      const s = fs.statSync(full);
      console.log(`${full} (${s.size} bytes, modified ${s.mtime.toLocaleString()})`);
    }
  }
}
