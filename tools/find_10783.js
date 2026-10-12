const fs = require('fs');
const path = require('path');

function searchFolder(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          // don't recurse deeply into huge system folders
        } else if (stat.size < 5000000) {
          const buf = fs.readFileSync(full);
          const sLatin = buf.toString('latin1');
          const sUtf8 = buf.toString('utf8');
          const sUtf16 = buf.toString('utf16le');
          if (sLatin.includes('10783') || sUtf8.includes('10783') || sUtf16.includes('10783')) {
            console.log(`[MATCH 10783] in ${full}`);
            const idx = Math.max(sLatin.indexOf('10783'), sUtf8.indexOf('10783'), sUtf16.indexOf('10783'));
            console.log(sLatin.slice(Math.max(0, idx - 80), Math.min(sLatin.length, idx + 120)).replace(/\r?\n/g, ' '));
          }
        }
      } catch (err) {}
    }
  } catch (err) {}
}

console.log('Searching C:\\MaxiREST_SQL...');
searchFolder('C:\\MaxiREST_SQL');
console.log('Searching C:\\MaxiRest...');
searchFolder('C:\\MaxiRest');
console.log('Searching C:\\MaxiADMIN...');
searchFolder('C:\\MaxiADMIN');
