const fs = require('fs');

const p = 'C:/MaxiRest/35522719.DBF';
const stat = fs.statSync(p);
console.log('File size:', stat.size, 'Modified:', stat.mtime);

const fd = fs.openSync(p, 'r');
const buf = Buffer.alloc(32);
fs.readSync(fd, buf, 0, 32, 0);
const numRecords = buf.readUInt32LE(4);
const headerLen = buf.readUInt16LE(8);
const recordLen = buf.readUInt16LE(10);
console.log('Records:', numRecords, 'HeaderLen:', headerLen, 'RecordLen:', recordLen);

const fieldsBuf = Buffer.alloc(headerLen - 32);
fs.readSync(fd, fieldsBuf, 0, fieldsBuf.length, 32);
const fields = [];
for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
  if (fieldsBuf[offset] === 0x0D) break;
  const name = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
  const type = String.fromCharCode(fieldsBuf[offset + 11]);
  const len = fieldsBuf[offset + 16];
  fields.push({ name, type, len });
}
console.log('Fields:', fields.map(f => f.name + '(' + f.type + ',' + f.len + ')').join(', '));

// Read the LAST 15 records
const count = 15;
const lastRecOffset = headerLen + (numRecords - count) * recordLen;
const recBuf = Buffer.alloc(recordLen * count);
fs.readSync(fd, recBuf, 0, recBuf.length, lastRecOffset);
fs.closeSync(fd);

for (let i = 0; i < count; i++) {
  const row = {};
  let cur = i * recordLen + 1;
  fields.forEach(f => {
    let val;
    if (f.type === 'I') {
      val = recBuf.readInt32LE(cur);
    } else {
      val = recBuf.slice(cur, cur + f.len).toString('latin1').trim();
    }
    row[f.name] = val;
    cur += f.len;
  });
  console.log(`Rec [${numRecords - count + i}]: FECHA=${row.FECHA} CPB=${row.CPB} MESA=${row.MESA} MOZO=${row.MOZO} TOTAL=${row.TOTAL} CUB=${row.CUBIERTOS} CTV=${row.COD_CTV}`);
}
