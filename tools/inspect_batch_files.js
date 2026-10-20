const fs = require('fs');

const files = [
  '54073340.dbf',
  '54086289.dbf',
  '54112891.dbf',
  '54133780.dbf',
  '54174168.dbf',
  '54187594.dbf',
  '54287759.dbf',
  '54358131.dbf'
];

files.forEach(f => {
  const p = 'C:/MaxiRest/' + f;
  const buf = fs.readFileSync(p);
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
  const tot = rows.find(r => r.NOMBRE === 'TOTAL' || r.ID === '02');
  console.log(`=== ${f} === Total: ${tot ? tot.IMPORTE : 'N/A'}, Ventas: ${tot ? tot.VENTAS : 'N/A'}`);
  rows.filter(r => r.NOMBRE && r.NOMBRE !== 'TOTAL' && r.NOMBRE !== 'RESUMEN').forEach(r => {
    console.log(`   ${r.NOMBRE}: $${r.IMPORTE} (${r.VENTAS} tks, ${r.PORCENTAJE}%)`);
  });
});
