const fs = require('fs');
const path = require('path');

function inspectDbfHeader(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(32);
    fs.readSync(fd, headerBuf, 0, 32, 0);
    const count = headerBuf.readUInt32LE(4);
    const headerLen = headerBuf.readUInt16LE(8);
    const recordLen = headerBuf.readUInt16LE(10);
    
    const fieldsBuf = Buffer.alloc(headerLen - 32);
    fs.readSync(fd, fieldsBuf, 0, headerLen - 32, 32);
    fs.closeSync(fd);
    
    const fields = [];
    for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
      if (fieldsBuf[offset] === 0x0D) break;
      const name = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0.*$/, '').trim();
      const type = String.fromCharCode(fieldsBuf[offset + 11]);
      const len = fieldsBuf[offset + 16];
      fields.push({ name, type, len });
    }
    return { count, headerLen, recordLen, fields };
  } catch (e) {
    return null;
  }
}

const dbfDir = 'C:\\MaxiRest';
const files = fs.readdirSync(dbfDir).filter(f => f.toLowerCase().endsWith('.dbf'));

console.log('Searching for DBFs with article / item details...');
for (const f of files) {
  const full = path.join(dbfDir, f);
  const info = inspectDbfHeader(full);
  if (!info || info.count === 0) continue;
  
  const fnames = info.fields.map(x => x.name.toUpperCase());
  const hasArtCode = fnames.some(fn => fn === 'COD_ART' || fn === 'CODIGO' || fn === 'COD_ARTIC');
  const hasCant = fnames.some(fn => fn === 'CANTIDAD' || fn === 'UNIDADES' || fn === 'CANT');
  const hasPrice = fnames.some(fn => fn === 'PUNIT' || fn === 'PRECIO' || fn === 'TOTAL' || fn === 'IMPORTE' || fn === 'VENTA');
  
  if (hasArtCode && hasCant && hasPrice) {
    console.log(`- ${f} (${info.count} recs, recordLen=${info.recordLen}): ${fnames.join(', ')}`);
  }
}
