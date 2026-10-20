const fs = require('fs');
const path = require('path');

function inspectDbf(filePath) {
  try {
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
    
    const records = [];
    const recBuf = Buffer.alloc(recordLen);
    const sampleLimit = Math.min(count, 5);
    for (let i = 0; i < sampleLimit; i++) {
      fs.readSync(fd, recBuf, 0, recordLen, headerLen + i * recordLen);
      if (recBuf[0] === 0x2A) continue;
      const row = {};
      for (const f of fields.slice(0, 8)) {
        row[f.name] = recBuf.toString('latin1', f.offset, f.offset + f.len).trim();
      }
      records.push(row);
    }
    fs.closeSync(fd);
    return { count, fields: fields.map(f => f.name), sample: records };
  } catch(e) {
    return null;
  }
}

const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));
const since = new Date('2026-10-12T00:00:00Z');

console.log('Inspecting DBFs modified since 12/10/2026:');
for (const f of files) {
  const full = path.join(dir, f);
  const stat = fs.statSync(full);
  if (stat.mtime >= since) {
    const info = inspectDbf(full);
    if (!info) continue;
    console.log(`\n--- ${f} (${info.count} recs, ${stat.mtime.toLocaleString()}) ---`);
    console.log(`Fields: ${info.fields.join(', ')}`);
    if (info.sample.length > 0) {
      console.log('Sample row:', JSON.stringify(info.sample[0]));
    }
  }
}
