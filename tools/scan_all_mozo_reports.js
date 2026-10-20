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
    
    // Read fields
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

// 1. Check all PRF files in C:\MaxiREST_SQL
console.log('=== CHECKING PRF FILES ===');
const prfDir = 'C:\\MaxiREST_SQL';
if (fs.existsSync(prfDir)) {
  const prfs = fs.readdirSync(prfDir).filter(f => f.endsWith('.Prf') || f.endsWith('.prf'));
  for (const prf of prfs) {
    const content = fs.readFileSync(path.join(prfDir, prf), 'latin1');
    const informeMatch = content.match(/Informe\.Value\s*=\s*'([^']+)'/i);
    const desFec = content.match(/DesFec\.Value\s*=\s*\{([^}]+)\}/i);
    const hasFec = content.match(/HasFec\.Value\s*=\s*\{([^}]+)\}/i);
    const stat = fs.statSync(path.join(prfDir, prf));
    console.log(`${prf} [${stat.mtime.toISOString()}]: Informe="${informeMatch ? informeMatch[1].trim() : '-'}" Desde=${desFec ? desFec[1] : '-'} Hasta=${hasFec ? hasFec[1] : '-'}`);
  }
}

// 2. Scan DBFs in C:\MaxiRest with fields MOZO or ARTICULO or NOMBREMOZ or similar
console.log('\n=== SCANNING DBFs FOR MOZO / VENTA DETALLADA FIELDS ===');
const dbfDir = 'C:\\MaxiRest';
if (fs.existsSync(dbfDir)) {
  const files = fs.readdirSync(dbfDir).filter(f => f.toLowerCase().endsWith('.dbf'));
  console.log(`Total DBFs in ${dbfDir}: ${files.length}`);
  const matches = [];
  for (const f of files) {
    const full = path.join(dbfDir, f);
    const info = inspectDbfHeader(full);
    if (!info) continue;
    const fieldNames = info.fields.map(x => x.name.toUpperCase());
    
    // Check if it has mozo-related fields
    const hasMozo = fieldNames.some(fn => fn.includes('MOZO') || fn === 'CODMOZ' || fn === 'NOMMOZ' || fn === 'NOMBREMOZ');
    const hasArt = fieldNames.some(fn => fn.includes('ART') || fn === 'CODIGO' || fn === 'NOMBREART' || fn === 'DETALLE');
    const hasFecha = fieldNames.some(fn => fn.includes('FECHA') || fn === 'FEC');
    
    if (hasMozo) {
      const stat = fs.statSync(full);
      matches.push({
        file: f,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        records: info.count,
        recordLen: info.recordLen,
        hasArt,
        hasFecha,
        fields: fieldNames.join(', ')
      });
    }
  }
  
  matches.sort((a, b) => b.size - a.size);
  console.log(`Found ${matches.length} DBFs with MOZO fields:`);
  for (const m of matches) {
    console.log(`- ${m.file} (${m.records} recs, ${m.size} bytes, ${m.mtime}) [Art:${m.hasArt}, Fec:${m.hasFecha}]`);
    console.log(`  Fields: ${m.fields.slice(0, 120)}...`);
  }
}
