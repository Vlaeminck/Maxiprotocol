const fs = require('fs');

function readDbf(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const hBuf = Buffer.alloc(32);
  fs.readSync(fd, hBuf, 0, 32, 0);
  const count = hBuf.readUInt32LE(4);
  const headerLen = hBuf.readUInt16LE(8);
  const recordLen = hBuf.readUInt16LE(10);
  
  const fBuf = Buffer.alloc(headerLen - 32);
  fs.readSync(fd, fBuf, 0, headerLen - 32, 32);
  
  const fields = [];
  for (let off = 0; off + 32 <= fBuf.length; off += 32) {
    if (fBuf[off] === 0x0D) break;
    const name = fBuf.toString('ascii', off, off + 11).replace(/\0.*$/, '').trim();
    const type = String.fromCharCode(fBuf[off + 11]);
    const len = fBuf[off + 16];
    fields.push({ name, type, len });
  }
  
  const records = [];
  const recBuf = Buffer.alloc(recordLen);
  for (let i = 0; i < count; i++) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
    if (recBuf[0] === 0x2A) continue; // deleted
    const rec = {};
    let pos = 1;
    for (const f of fields) {
      rec[f.name] = recBuf.toString('latin1', pos, pos + f.len).trim();
      pos += f.len;
    }
    records.push(rec);
  }
  fs.closeSync(fd);
  return { fields, records };
}

console.log('=== BAKINFORME.DBF ===');
const bak = readDbf('C:\\MaxiREST_SQL\\bakinforme.dbf');
console.log('Fields:', bak.fields.map(f => `${f.name}(${f.len})`).join(', '));
console.log(`Records (${bak.records.length}):`);
console.log(bak.records.slice(0, 15));
