const fs = require('fs');
const path = require('path');

console.log('=== BUSCANDO "DESKTOP-33JNCVB" EN DISCO ===\n');

const dirs = [
  'C:\\MaxiREST_SQL',
  'C:\\MaxiRest',
  'C:\\MaxiADMIN',
  'C:\\Users\\Gardenias',
  'C:\\Users\\Gardenias\\AppData\\Local',
  'C:\\Users\\Gardenias\\AppData\\Roaming'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  try {
    const files = fs.readdirSync(d);
    files.forEach(f => {
      try {
        const p = path.join(d, f);
        const st = fs.statSync(p);
        if (!st.isDirectory() && st.size < 10000000) {
          const buf = fs.readFileSync(p);
          if (buf.includes('DESKTOP-33JNCVB') || buf.includes('33JNCVB')) {
            console.log(`[MATCH]: ${p}`);
            const str = buf.toString('latin1');
            const idx = str.indexOf('33JNCVB');
            console.log(str.slice(Math.max(0, idx - 100), Math.min(str.length, idx + 200)));
          }
        }
      } catch (e) {}
    });
  } catch (e) {}
});
