const fs = require('fs');
const path = require('path');

function inspectDbfSales(filePath) {
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
  
  const recBuf = Buffer.alloc(recordLen);
  const dates = new Set();
  const mozos = new Set();
  let totalRecs = 0;
  
  // Field offsets
  let fechaOff = -1, fechaLen = 0;
  let mozoOff = -1, mozoLen = 0;
  let nomMozOff = -1, nomMozLen = 0;
  let artOff = -1, artLen = 0;
  
  let pos = 1;
  for (const f of fields) {
    if (f.name === 'FECHA') { fechaOff = pos; fechaLen = f.len; }
    if (f.name === 'MOZO' || f.name === 'COD_EMP') { mozoOff = pos; mozoLen = f.len; }
    if (f.name === 'NOMBREMOZ' || f.name === 'NOM_EMP') { nomMozOff = pos; nomMozLen = f.len; }
    if (f.name === 'NOMBREART' || f.name === 'NOMBRE') { artOff = pos; artLen = f.len; }
    pos += f.len;
  }
  
  for (let i = 0; i < count; i++) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
    if (recBuf[0] === 0x2A) continue;
    totalRecs++;
    if (fechaOff > 0) {
      const d = recBuf.toString('latin1', fechaOff, fechaOff + fechaLen).trim();
      dates.add(d);
    }
    if (nomMozOff > 0) {
      const m = recBuf.toString('latin1', nomMozOff, nomMozOff + nomMozLen).trim();
      if (m) mozos.add(m);
    } else if (mozoOff > 0) {
      const m = recBuf.toString('latin1', mozoOff, mozoOff + mozoLen).trim();
      if (m) mozos.add(m);
    }
  }
  fs.closeSync(fd);
  return { count, totalRecs, dates: Array.from(dates), mozos: Array.from(mozos) };
}

const detailedFiles = ['39076206.dbf', '39122690.dbf', '39136030.dbf', '42412338.dbf', '53706635.dbf', '47778738.dbf'];
for (const f of detailedFiles) {
  const full = path.join('C:\\MaxiRest', f);
  if (fs.existsSync(full)) {
    const res = inspectDbfSales(full);
    console.log(`\n=== ${f} (${res.totalRecs} recs) ===`);
    console.log(`Dates (${res.dates.length}):`, res.dates.slice(0, 10));
    console.log(`Mozos (${res.mozos.length}):`, res.mozos);
  }
}
