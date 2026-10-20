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

console.log(`Inspecting ${files.length} DBFs in ${dbfDir}...`);
const reportTypes = {};

for (const f of files) {
  const full = path.join(dbfDir, f);
  const info = inspectDbfHeader(full);
  if (!info || info.count === 0) continue;
  
  const fnames = info.fields.map(x => x.name.toUpperCase());
  const sig = fnames.slice(0, 5).join('|');
  
  if (!reportTypes[sig]) {
    reportTypes[sig] = { count: 0, sampleFile: f, fields: fnames, totalRecs: 0, files: [] };
  }
  reportTypes[sig].count++;
  reportTypes[sig].totalRecs += info.count;
  reportTypes[sig].files.push({ file: f, recs: info.count, size: fs.statSync(full).size });
}

console.log(`Distinct table schemas found: ${Object.keys(reportTypes).length}\n`);
for (const [sig, data] of Object.entries(reportTypes)) {
  console.log(`SCHEMA [${data.count} files, total ${data.totalRecs} recs]: Sample: ${data.sampleFile}`);
  console.log(`  Fields: ${data.fields.join(', ')}`);
  if (data.fields.some(fn => fn.includes('MOZ') || fn.includes('ART') || fn.includes('COM') || fn.includes('RUB'))) {
    console.log(`  *** INTERESTING FOR SALES/MOZOS ***`);
    console.log(`  Files:`, data.files.slice(0, 5).map(x => `${x.file} (${x.recs} r)`).join(', '));
  }
  console.log('---');
}
