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

const items = readAll('C:/MaxiRest/33859030.dbf');
console.log('Total items in 33859030.dbf:', items.length);
// Sort by IMPORTE desc
items.sort((a,b) => parseFloat(b.IMPORTE) - parseFloat(a.IMPORTE));
console.log('--- TOP 25 REAL PRODUCTS (12/10/2026) ---');
items.slice(0, 25).forEach((r, idx) => {
  console.log(`${idx + 1}. [Cod ${r.CODIGO}] ${r.NOMBRE} | Unidades: ${r.UNIDADES} | Total: $${r.IMPORTE} | % Total: ${r.P_TOTAL}% | Neto: $${r.NETO}`);
});

const rubros = readAll('C:/MaxiRest/33371579.dbf');
console.log('\nTotal rubros records in 33371579.dbf:', rubros.length);
// Group by NOMRUB
const rubroMap = {};
rubros.forEach(r => {
  const nr = r.NOMRUB || 'OTROS / GENERAL';
  const vta = parseFloat(r.VENTA) || 0;
  rubroMap[nr] = (rubroMap[nr] || 0) + vta;
});
console.log('--- REAL VENTAS POR RUBRO (12/10/2026) ---');
Object.entries(rubroMap).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`   ${k}: $${v.toLocaleString('es-AR')}`);
});
