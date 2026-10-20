const fs = require('fs');

function inspectFrx(filePath) {
  const fd = fs.openSync(filePath, 'r');
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
  
  console.log(`FRX ${filePath}: ${count} recs`);
  const recBuf = Buffer.alloc(recordLen);
  for (let i = 0; i < count; i++) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
    const expr = recBuf.toString('latin1', 1, 1 + Math.min(recordLen - 1, 200));
    // Look for expr or tag
    if (expr.includes('SELECT') || expr.includes('FROM') || expr.includes('WHERE') || expr.includes('TABLE') || expr.includes('ALIAS')) {
      console.log(`Rec #${i}:`, expr.trim().slice(0, 150));
    }
  }
  fs.closeSync(fd);
}

inspectFrx('C:\\MaxiADMIN\\INICIOINF\\VTASMOZODET.FRX');
