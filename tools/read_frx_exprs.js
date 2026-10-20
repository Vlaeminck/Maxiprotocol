const fs = require('fs');

const fd = fs.openSync('C:\\MaxiADMIN\\INICIOINF\\VTASMOZODET.FRX', 'r');
const hBuf = Buffer.alloc(32);
fs.readSync(fd, hBuf, 0, 32, 0);
const count = hBuf.readUInt32LE(4);
const headerLen = hBuf.readUInt16LE(8);
const recordLen = hBuf.readUInt16LE(10);

const fBuf = Buffer.alloc(headerLen - 32);
fs.readSync(fd, fBuf, 0, headerLen - 32, 32);

const fields = [];
let curOff = 1;
for (let off = 0; off + 32 <= fBuf.length; off += 32) {
  if (fBuf[off] === 0x0D) break;
  const name = fBuf.toString('ascii', off, off + 11).replace(/\0.*$/, '').trim();
  const type = String.fromCharCode(fBuf[off + 11]);
  const len = fBuf[off + 16];
  fields.push({ name, type, len, offset: curOff });
  curOff += len;
}

const recBuf = Buffer.alloc(recordLen);
for (let i = 0; i < count; i++) {
  fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
  const row = {};
  for (const f of fields) {
    if (['EXPR', 'TAG', 'TAG2', 'NAME'].includes(f.name)) {
      const val = recBuf.toString('latin1', f.offset, f.offset + f.len).trim();
      if (val) row[f.name] = val;
    }
  }
  if (Object.keys(row).length > 0) {
    console.log(`Rec #${i}:`, row);
  }
}
fs.closeSync(fd);
