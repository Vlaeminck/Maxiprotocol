const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));
const stats = files.map(f => {
  const p = path.join(dir, f);
  const st = fs.statSync(p);
  return { file: f, path: p, size: st.size, mtime: st.mtime };
}).sort((a, b) => b.size - a.size);

function parseHeader(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(32);
    fs.readSync(fd, headerBuf, 0, 32, 0);
    const numRecords = headerBuf.readUInt32LE(4);
    const headerLen = headerBuf.readUInt16LE(8);
    const recordLen = headerBuf.readUInt16LE(10);
    const fieldsBuf = Buffer.alloc(headerLen - 32);
    fs.readSync(fd, fieldsBuf, 0, headerLen - 32, 32);
    const fields = [];
    for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
      if (fieldsBuf[offset] === 0x0D) break;
      const fieldName = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
      const fieldType = String.fromCharCode(fieldsBuf[offset + 11]);
      const fieldLen = fieldsBuf[offset + 16];
      fields.push({ name: fieldName, type: fieldType, len: fieldLen });
    }

    const records = [];
    if (numRecords > 0 && recordLen > 0) {
      const recBuf = Buffer.alloc(recordLen);
      const toRead = Math.min(numRecords, 5);
      for (let r = 0; r < toRead; r++) {
        fs.readSync(fd, recBuf, 0, recordLen, headerLen + (r * recordLen));
        const row = {};
        let recOff = 1; // Primer byte es flag de borrado ' ' o '*'
        fields.forEach(f => {
          row[f.name] = recBuf.toString('latin1', recOff, recOff + f.len).trim();
          recOff += f.len;
        });
        records.push(row);
      }
    }
    fs.closeSync(fd);
    return { numRecords, fields: fields.map(f => `${f.name}(${f.type})`).join(','), records };
  } catch (e) {
    return { numRecords: 0, fields: e.message, records: [] };
  }
}

console.log('=== TOP 5 TABLAS POR TAMAÑO ===');
stats.slice(0, 5).forEach(s => {
  const h = parseHeader(s.path);
  console.log(`\nTABLA: ${s.file} | ${(s.size / (1024*1024)).toFixed(2)} MB | ${h.numRecords} registros | mod: ${s.mtime.toISOString().substring(0,10)}`);
  console.log(`CAMPOS: ${h.fields}`);
  console.log(`REGISTROS EJEMPLO:`, JSON.stringify(h.records.slice(0, 2), null, 2));
});
