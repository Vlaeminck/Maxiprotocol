const fs = require('fs');

const frt = fs.readFileSync('C:\\MaxiADMIN\\INICIOINF\\VTASMOZODET.FRT', 'latin1');
console.log('FRT contents:');
const matches = frt.match(/[a-zA-Z0-9_\.]+(\s*[\+\-\*\/\,\(\)\=]\s*[a-zA-Z0-9_\.]+)+/g);
console.log('Expressions found in FRT:');
const clean = new Set();
for (const line of frt.split('\0')) {
  const t = line.trim();
  if (t.length > 2 && t.length < 100 && !t.includes('FoxPro') && !t.includes('Windows') && !t.includes('Courier')) {
    clean.add(t);
  }
}
for (const item of Array.from(clean).slice(0, 40)) {
  console.log('-', item);
}
