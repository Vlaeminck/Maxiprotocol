const fs = require('fs');

function readDbf(fp) {
  if (!fs.existsSync(fp)) return [];
  const buf = fs.readFileSync(fp);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  
  const fields = [];
  let offset = 32;
  while (buf[offset] !== 0x0D && offset < headerLen) {
    const name = buf.slice(offset, offset + 11).toString('latin1').replace(/\0/g, '').trim();
    const type = String.fromCharCode(buf[offset + 11]);
    const len = buf[offset + 16];
    fields.push({ name, type, len });
    offset += 32;
  }
  
  const records = [];
  for (let i = 0; i < Math.min(numRecords, 20); i++) {
    const recOffset = headerLen + i * recordLen;
    const row = {};
    let colOffset = recOffset + 1;
    for (const f of fields) {
      row[f.name] = buf.slice(colOffset, colOffset + f.len).toString('latin1').trim();
      colOffset += f.len;
    }
    records.push(row);
  }
  return { fields, records };
}

console.log('mxmod.DBF:', JSON.stringify(readDbf('C:/MaxiREST_SQL/mxmod.DBF'), null, 2));
