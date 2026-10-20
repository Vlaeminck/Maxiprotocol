const fs = require('fs');

const fp = 'C:/MaxiREST_SQL/bakinforme.dbf';
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

console.log(`bakinforme.dbf: Records=${numRecords}, HeaderLen=${headerLen}, RecordLen=${recordLen}`);
console.log('Fields:', fields);

const records = [];
for (let i = 0; i < numRecords; i++) {
  const recOffset = headerLen + i * recordLen;
  const row = {};
  let cur = recOffset + 1;
  for (const f of fields) {
    row[f.name] = buf.slice(cur, cur + f.len).toString('latin1').trim();
    cur += f.len;
  }
  records.push(row);
}

console.log('Records:');
console.log(JSON.stringify(records, null, 2));
