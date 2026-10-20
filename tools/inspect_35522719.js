const fs = require('fs');

const fd = fs.openSync('C:\\MaxiRest\\35522719.DBF', 'r');
const hBuf = Buffer.alloc(32);
fs.readSync(fd, hBuf, 0, 32, 0);
const count = hBuf.readUInt32LE(4);
const headerLen = hBuf.readUInt16LE(8);
const recordLen = hBuf.readUInt16LE(10);

console.log(`35522719.DBF: ${count} recs, recordLen=${recordLen}, headerLen=${headerLen}`);

const recBuf = Buffer.alloc(recordLen);
// Read the last 5 records
for (let i = count - 5; i < count; i++) {
  fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
  const fecha = recBuf.toString('ascii', 2, 10).trim();
  const cpb = recBuf.toString('ascii', 16, 20).trim();
  const num = recBuf.toString('ascii', 25, 33).trim();
  const codEmp = recBuf.toString('ascii', 45, 50).trim();
  const total = recBuf.toString('ascii', 140, 155).trim();
  console.log(`Rec #${i}: Fecha=${fecha}, Cpb=${cpb}, Num=${num}, CodEmp=${codEmp}, Total=${total}`);
}
fs.closeSync(fd);
