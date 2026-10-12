const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));

console.log(`Analizando ${files.length} archivos DBF en ${dir}...\n`);

function parseDbfHeader(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(32);
    fs.readSync(fd, headerBuf, 0, 32, 0);

    const version = headerBuf.readUInt8(0);
    const lastUpdate = `20${headerBuf.readUInt8(1)}-${headerBuf.readUInt8(2)}-${headerBuf.readUInt8(3)}`;
    const numRecords = headerBuf.readUInt32LE(4);
    const headerLen = headerBuf.readUInt16LE(8);
    const recordLen = headerBuf.readUInt16LE(10);

    // Leer campos
    const fieldsBuf = Buffer.alloc(headerLen - 32);
    fs.readSync(fd, fieldsBuf, 0, headerLen - 32, 32);

    const fields = [];
    for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
      if (fieldsBuf[offset] === 0x0D) break; // Fin de campos
      const fieldName = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
      const fieldType = String.fromCharCode(fieldsBuf[offset + 11]);
      const fieldLen = fieldsBuf[offset + 16];
      fields.push(`${fieldName}(${fieldType},${fieldLen})`);
    }

    // Leer primeros registros si numRecords > 0
    let sampleData = [];
    if (numRecords > 0 && recordLen > 0) {
      const recBuf = Buffer.alloc(recordLen);
      const readRecords = Math.min(numRecords, 3);
      for (let r = 0; r < readRecords; r++) {
        fs.readSync(fd, recBuf, 0, recordLen, headerLen + (r * recordLen));
        sampleData.push(recBuf.toString('latin1').substring(1, 100).trim());
      }
    }

    fs.closeSync(fd);

    return {
      file: path.basename(filePath),
      version,
      lastUpdate,
      numRecords,
      fields: fields.join(', '),
      sampleData
    };
  } catch (err) {
    return { file: path.basename(filePath), error: err.message };
  }
}

// Analizar los 20 DBF más grandes o más recientes
const stats = files.map(f => {
  const p = path.join(dir, f);
  const st = fs.statSync(p);
  return { file: f, path: p, size: st.size, mtime: st.mtime };
});

stats.sort((a, b) => b.size - a.size);

console.log('--- TOP 20 ARCHIVOS DBF POR TAMAÑO ---');
stats.slice(0, 20).forEach(s => {
  const info = parseDbfHeader(s.path);
  console.log(`\n📁 Archivo: ${s.file} (${(s.size/1024).toFixed(1)} KB) | Modificado: ${s.mtime.toISOString().substring(0,10)} | Registros: ${info.numRecords}`);
  console.log(`   Campos: ${info.fields}`);
  if (info.sampleData && info.sampleData.length > 0) {
    console.log(`   Muestra: ${JSON.stringify(info.sampleData[0])}`);
  }
});

// Buscar si algún archivo DBF tiene nombres como MESA, MOZO, ARTICULO, COMANDA en sus campos
console.log('\n--- BUSCANDO TABLAS CLAVE POR NOMBRES DE CAMPOS ---');
stats.forEach(s => {
  const info = parseDbfHeader(s.path);
  if (info.fields) {
    const fUpper = info.fields.toUpperCase();
    if (fUpper.includes('MESA') || fUpper.includes('MOZO') || fUpper.includes('COMANDA') || fUpper.includes('ARTIC') || fUpper.includes('PRECIO') || fUpper.includes('RUBRO') || fUpper.includes('TOTAL') || fUpper.includes('DESCRIP')) {
      console.log(`🎯 Coincidencia clave en ${s.file}: Registros: ${info.numRecords} | Campos: ${info.fields.substring(0, 120)}...`);
    }
  }
});
