const fs = require('fs');
const path = require('path');
const dir = 'C:/MaxiRest';

const knownPaymentFiles = {
  '2026-10-12': '33015712.dbf',
  '2026-10-11': '37034789.dbf',
  '2026-10-10': '40694411.dbf',
  '2026-10-09': '52568701.dbf',
  '2026-10-08': '32315984.dbf',
  '2026-10-07': '35436379.dbf',
  '2026-10-06': '29294376.dbf',
  '2026-10-05': '35672286.dbf',
  '2026-10-01': '34354746.dbf',
  '2026-09-01': '54358131.dbf'
};

const allFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf')).map(f => {
  const p = path.join(dir, f);
  const stat = fs.statSync(p);
  return { file: f, path: p, mtime: stat.mtime };
});

for (const [date, payFile] of Object.entries(knownPaymentFiles)) {
  const payPath = path.join(dir, payFile);
  if (!fs.existsSync(payPath)) continue;
  const payTime = fs.statSync(payPath).mtime.getTime();
  
  // Find all DBF files modified within 10 minutes of payFile
  const companions = allFiles.filter(item => {
    const diff = Math.abs(item.mtime.getTime() - payTime);
    return diff <= 10 * 60 * 1000;
  });
  
  console.log(`\n========================================`);
  console.log(`DATE: ${date} (Payment file: ${payFile}, modified: ${new Date(payTime).toISOString()})`);
  console.log(`Found ${companions.length} companion files modified around this time:`);
  
  companions.forEach(c => {
    try {
      const buf = fs.readFileSync(c.path);
      const numRecords = buf.readUInt32LE(4);
      const headerLen = buf.readUInt16LE(8);
      const recordLen = buf.readUInt16LE(10);
      let offset = 32;
      const fields = [];
      while (offset < headerLen - 1 && offset < buf.length) {
        if (buf[offset] === 0x0D) break;
        const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
        const len = buf[offset + 16];
        fields.push(name);
        offset += 32;
      }
      console.log(`   ${c.file} (${new Date(c.mtime).toLocaleTimeString()}): ${numRecords} recs, Fields: ${fields.slice(0, 10).join(', ')}`);
      
      // If it contains CUB, show records!
      if (fields.includes('CUB') || fields.includes('SALON')) {
        let recOff = headerLen;
        for (let i = 0; i < Math.min(numRecords, 5); i++) {
          const row = {};
          let cur = recOff + 1;
          // read all fields
          let curOff = 32;
          while (curOff < headerLen - 1 && curOff < buf.length) {
            if (buf[curOff] === 0x0D) break;
            const fn = buf.toString('ascii', curOff, curOff + 11).replace(/\0/g, '').trim();
            const flen = buf[curOff + 16];
            row[fn] = buf.slice(cur, cur + flen).toString('latin1').trim();
            cur += flen;
            curOff += 32;
          }
          console.log(`      Record [${i}]:`, row);
          recOff += recordLen;
        }
      }
    } catch (e) {}
  });
}
