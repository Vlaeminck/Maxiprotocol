const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== TOP 10 ARCHIVOS DBF EN C:\\MaxiRest ===');
const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));
const stats = files.map(f => {
  const p = path.join(dir, f);
  const st = fs.statSync(p);
  return { file: f, path: p, size: st.size, mtime: st.mtime };
}).sort((a, b) => b.size - a.size);

function parseHeaderQuick(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(32);
    fs.readSync(fd, headerBuf, 0, 32, 0);
    const numRecords = headerBuf.readUInt32LE(4);
    const headerLen = headerBuf.readUInt16LE(8);
    const fieldsBuf = Buffer.alloc(headerLen - 32);
    fs.readSync(fd, fieldsBuf, 0, headerLen - 32, 32);
    const fields = [];
    for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
      if (fieldsBuf[offset] === 0x0D) break;
      const fieldName = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
      const fieldType = String.fromCharCode(fieldsBuf[offset + 11]);
      const fieldLen = fieldsBuf[offset + 16];
      fields.push(`${fieldName}(${fieldType},${fieldLen})`);
    }
    fs.closeSync(fd);
    return { numRecords, fields: fields.join(', ') };
  } catch (e) {
    return { numRecords: 0, fields: e.message };
  }
}

stats.slice(0, 10).forEach(s => {
  const h = parseHeaderQuick(s.path);
  console.log(`- ${s.file} | ${(s.size / (1024*1024)).toFixed(2)} MB | ${h.numRecords} registros | mod: ${s.mtime.toISOString().substring(0,10)}`);
  console.log(`  Campos: ${h.fields}\n`);
});

console.log('\n=== BUSCANDO maxirest.exe Y ARCHIVOS .fdb EN EL SISTEMA ===');
try {
  // Búsqueda rápida con where o dir en C:
  const drives = ['C:'];
  drives.forEach(d => {
    try {
      console.log(`Buscando *.fdb en ${d}\\...`);
      const res = execSync(`dir /s /b ${d}\\*.fdb 2>nul`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      console.log('Archivos FDB encontrados:\n', res);
    } catch (e) {
      console.log('No se encontraron *.fdb');
    }

    try {
      console.log(`Buscando *maxi*.exe en ${d}\\...`);
      const res2 = execSync(`dir /s /b ${d}\\maxirest.exe ${d}\\maxi*.exe 2>nul`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      console.log('Ejecutables Maxi encontrados:\n', res2);
    } catch (e) {
      console.log('No se encontraron ejecutables maxi*.exe');
    }
  });
} catch (err) {
  console.error(err);
}
