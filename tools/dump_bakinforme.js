const fs = require('fs');

const p = 'C:\\MaxiREST_SQL\\bakinforme.dbf';
const buf = fs.readFileSync(p);

const numRecords = buf.readUInt32LE(4);
const headerLen = buf.readUInt16LE(8);
const recordLen = buf.readUInt16LE(10);

console.log(`bakinforme.dbf: Records: ${numRecords}, HeaderLen: ${headerLen}, RecordLen: ${recordLen}`);

let offset = 32;
const fields = [];
while (offset < headerLen - 1) {
  if (buf[offset] === 0x0D) break;
  const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
  const len = buf[offset + 16];
  fields.push({ name, len });
  offset += 32;
}
console.log('Fields:', fields.map(f => f.name).join(', '));

let recOff = headerLen;
for (let i = 0; i < Math.min(numRecords, 20); i++) {
  const row = {};
  let cur = recOff + 1;
  fields.forEach(f => {
    row[f.name] = buf.slice(cur, cur + f.len).toString('latin1').trim();
    cur += f.len;
  });
  console.log(`[${i}]:`, row);
  recOff += recordLen;
}
