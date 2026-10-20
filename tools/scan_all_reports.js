const fs = require('fs');
const path = require('path');

const dir = 'C:/MaxiRest';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));

const catalog = {
  conceptReports: [], // Has SALON, MOSTRADOR, DOMICILIO, TOTAL, CUB, VENTAS
  paymentReports: [], // Has EFECTIVO, PEDIDOYA, NAVE, TOTAL, etc.
  itemReports: [],    // Has UNIDADES, IMPORTE, etc.
  hourlyReports: [],  // Has H_7, H_8, etc.
  monthlyReports: [], // Monthly
  other: []
};

for (const f of files) {
  const p = path.join(dir, f);
  try {
    const buf = fs.readFileSync(p);
    if (buf.length < 32) continue;
    const numRecords = buf.readUInt32LE(4);
    const headerLen = buf.readUInt16LE(8);
    const recordLen = buf.readUInt16LE(10);
    let offset = 32;
    const fields = [];
    while (offset < headerLen - 1 && offset < buf.length) {
      if (buf[offset] === 0x0D) break;
      const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
      const len = buf[offset + 16];
      fields.push({ name, len });
      offset += 32;
    }
    const fieldNames = fields.map(x => x.name);
    
    // Read records
    const records = [];
    let recOff = headerLen;
    for (let i = 0; i < Math.min(numRecords, 50); i++) {
      const row = {};
      let cur = recOff + 1;
      fields.forEach(fld => {
        row[fld.name] = buf.slice(cur, cur + fld.len).toString('latin1').trim();
        cur += fld.len;
      });
      records.push(row);
      recOff += recordLen;
    }
    
    const mtime = fs.statSync(p).mtime.toISOString();
    
    if (fieldNames.includes('CUB') && fieldNames.includes('SALON') && fieldNames.includes('VENTAS')) {
      catalog.conceptReports.push({ file: f, mtime, numRecords, records });
    } else if (fieldNames.includes('CODIGO') && fieldNames.includes('NOMBRE') && fieldNames.includes('VENTAS') && fieldNames.includes('PORCENTAJE')) {
      catalog.paymentReports.push({ file: f, mtime, numRecords, records });
    } else if (fieldNames.includes('CUB') && fieldNames.includes('EFECTIVO') && fieldNames.includes('TARJETAS')) {
      catalog.monthlyReports.push({ file: f, mtime, numRecords, records });
    } else if (fieldNames.includes('H_12') || fieldNames.includes('H_13')) {
      catalog.hourlyReports.push({ file: f, mtime, numRecords, records });
    } else if (fieldNames.includes('UNIDADES') && fieldNames.includes('IMPORTE') && fieldNames.includes('NOMBRE')) {
      catalog.itemReports.push({ file: f, mtime, numRecords, recordsCount: numRecords });
    }
  } catch (e) {}
}

console.log('=== CONCEPT REPORTS (FECHA, SALON, CUB, VENTAS, TOTAL) ===');
catalog.conceptReports.forEach(c => {
  console.log(`\nFile: ${c.file} (Modified: ${c.mtime}, Records: ${c.numRecords})`);
  c.records.forEach(r => console.log('  ', r));
});

console.log('\n=== PAYMENT REPORTS (MEDIOS DE PAGO) ===');
catalog.paymentReports.forEach(c => {
  const totals = c.records.find(r => r.NOMBRE === 'TOTAL' || r.ID === '02');
  console.log(`File: ${c.file} (Modified: ${c.mtime}) -> Total:`, totals ? totals.IMPORTE : 'N/A', 'Ventas:', totals ? totals.VENTAS : 'N/A');
  const details = c.records.filter(r => r.NOMBRE && r.NOMBRE !== 'TOTAL' && r.NOMBRE !== 'RESUMEN');
  details.forEach(d => console.log(`   ${d.NOMBRE}: $${d.IMPORTE} (${d.VENTAS} tks, ${d.PORCENTAJE}%)`));
});

console.log('\n=== HOURLY REPORTS ===');
catalog.hourlyReports.forEach(c => {
  console.log(`File: ${c.file} (Modified: ${c.mtime}, Records: ${c.numRecords})`);
  c.records.slice(0, 5).forEach(r => console.log('  ', r.DIA, r.FECHA));
});
