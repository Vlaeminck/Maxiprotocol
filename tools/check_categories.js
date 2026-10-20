const fs = require('fs');

function readAll(filePath) {
  const buf = fs.readFileSync(filePath);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  let offset = 32;
  const fields = [];
  while (offset < headerLen - 1 && offset < buf.length) {
    if (buf[offset] === 0x0D) break;
    const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
    const len = buf[offset + 16];
    fields.push({ name, len });
    offset += 32;
  }
  let recOff = headerLen;
  const rows = [];
  for (let i = 0; i < numRecords; i++) {
    const row = {};
    let cur = recOff + 1;
    fields.forEach(fld => {
      row[fld.name] = buf.slice(cur, cur + fld.len).toString('latin1').trim();
      cur += fld.len;
    });
    rows.push(row);
    recOff += recordLen;
  }
  return rows;
}

const rows = readAll('C:/MaxiRest/33371579.dbf');
const rubros = new Set();
const subrubros = new Set();
const combinations = new Map();

rows.forEach(r => {
  rubros.add(r.NOMRUB);
  subrubros.add(r.NOMSUB);
  const key = `${r.NOMRUB} -> ${r.NOMSUB}`;
  combinations.set(key, (combinations.get(key) || 0) + 1);
});

console.log('--- ALL NOMRUB IN MAXIREST (33371579.dbf) ---');
console.log([...rubros]);

console.log('\n--- ALL NOMRUB -> NOMSUB COMBINATIONS ---');
for (const [k, count] of combinations.entries()) {
  console.log(`${k} (${count} articulos)`);
}

console.log('\n--- TARGET DISHES LOOKUP ---');
const codes = ['1338', '1335', '1346', '1332', '1343', '1336', '1334'];
rows.filter(r => codes.includes(r.CODIGO)).forEach(r => {
  console.log(`Cod ${r.CODIGO} | ${r.NOMBRE} => RUBRO: "${r.NOMRUB}" | SUBRUBRO: "${r.NOMSUB}"`);
});

console.log('\n--- SCANNING ALL DBFs IN C:/MaxiRest FOR "ESPECIALIDAD" ---');
const path = require('path');
const dir = 'C:/MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));
let found = 0;
for (const f of files) {
  try {
    const fullPath = path.join(dir, f);
    const buf = fs.readFileSync(fullPath);
    const str = buf.toString('latin1');
    if (/especialidad/i.test(str)) {
      console.log('Match in file:', f);
      found++;
    }
  } catch (e) {}
}
console.log('Total files matching "especialidad":', found);

