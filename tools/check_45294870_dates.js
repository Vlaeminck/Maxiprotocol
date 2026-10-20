const fs = require('fs');

const fd = fs.openSync('C:\\MaxiRest\\45294870.dbf', 'r');
const hBuf = Buffer.alloc(32);
fs.readSync(fd, hBuf, 0, 32, 0);
const count = hBuf.readUInt32LE(4);
const headerLen = hBuf.readUInt16LE(8);
const recordLen = hBuf.readUInt16LE(10);

console.log(`45294870.dbf: ${count} records, recordLen=${recordLen}, headerLen=${headerLen}`);

// Sample first, middle, last records
const dates = new Set();
const checkIndices = [0, 100, 1000, 10000, 50000, 100000, 150000, 180000, 200000, count - 1];
const recBuf = Buffer.alloc(recordLen);

for (const idx of checkIndices) {
  if (idx < count) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + idx * recordLen);
    const fecha = recBuf.toString('ascii', 1, 9).trim();
    const mozo = recBuf.toString('latin1', 58, 88).trim();
    const art = recBuf.toString('latin1', 181, 211).trim();
    console.log(`Rec #${idx}: Fecha=${fecha}, Mozo=${mozo}, Art=${art}`);
  }
}

// Find min and max dates
fs.readSync(fd, recBuf, 0, recordLen, headerLen);
const minDate = recBuf.toString('ascii', 1, 9).trim();
fs.readSync(fd, recBuf, 0, recordLen, headerLen + (count - 1) * recordLen);
const maxDate = recBuf.toString('ascii', 1, 9).trim();
console.log(`Min Date: ${minDate}, Max Date: ${maxDate}`);

fs.closeSync(fd);
