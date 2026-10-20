const fs = require('fs');

const fd = fs.openSync('C:\\MaxiRest\\35522719.DBF', 'r');
const hBuf = Buffer.alloc(32);
fs.readSync(fd, hBuf, 0, 32, 0);
const count = hBuf.readUInt32LE(4);
const headerLen = hBuf.readUInt16LE(8);
const recordLen = hBuf.readUInt16LE(10);

const fBuf = Buffer.alloc(headerLen - 32);
fs.readSync(fd, fBuf, 0, headerLen - 32, 32);

const fields = [];
let currOffset = 1; // 1-byte deletion flag
for (let off = 0; off + 32 <= fBuf.length; off += 32) {
  if (fBuf[off] === 0x0D) break;
  const name = fBuf.toString('ascii', off, off + 11).replace(/\0.*$/, '').trim();
  const type = String.fromCharCode(fBuf[off + 11]);
  const len = fBuf[off + 16];
  fields.push({ name, type, len, offset: currOffset });
  currOffset += len;
}

console.log('Fields of 35522719.DBF:');
for (const f of fields) {
  console.log(`- ${f.name} (type: ${f.type}, len: ${f.len}, offset: ${f.offset})`);
}

// Now read last 3 records properly
const recBuf = Buffer.alloc(recordLen);
for (let i = count - 3; i < count; i++) {
  fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
  const row = {};
  for (const f of fields) {
    if (['ID', 'FECHA', 'TURNO', 'COD_EMP', 'TOTAL', 'NUMERO', 'MESA', 'CUBIERTOS'].includes(f.name)) {
      row[f.name] = recBuf.toString('latin1', f.offset, f.offset + f.len).trim();
    }
  }
  console.log(`Row #${i}:`, row);
}

fs.closeSync(fd);
