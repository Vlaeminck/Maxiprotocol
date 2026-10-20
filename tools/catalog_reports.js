const fs = require('fs');
const path = require('path');
const dir = 'C:/MaxiRest';

const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dbf'));

const results = {
  concept: [],
  payments: [],
  items: [],
  rubros: [],
  hourly: []
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
    const names = fields.map(x => x.name);
    const mtime = fs.statSync(p).mtime.toISOString();
    
    // Read first few records
    const readRows = (max = 10) => {
      const rows = [];
      let recOff = headerLen;
      for (let i = 0; i < Math.min(numRecords, max); i++) {
        const row = {};
        let cur = recOff + 1;
        fields.forEach(fld => {
          row[fld.name] = buf.slice(cur, cur + fld.len).toString('latin1').trim();
          cur += fld.len;
        });
        rows.push(row);
        recOff += recordLen;
      }
      return rows;
    };

    if (names.includes('CUB') && names.includes('SALON') && names.includes('VENTAS')) {
      results.concept.push({ file: f, mtime, numRecords, rows: readRows(50) });
    } else if (names.includes('CODIGO') && names.includes('NOMBRE') && names.includes('VENTAS') && names.includes('PORCENTAJE')) {
      const rows = readRows(numRecords);
      const tot = rows.find(r => r.NOMBRE === 'TOTAL' || r.ID === '02');
      results.payments.push({
        file: f,
        mtime,
        numRecords,
        total: tot ? tot.IMPORTE : '',
        ventas: tot ? tot.VENTAS : '',
        rows
      });
    } else if (names.includes('CODIGO') && names.includes('NOMBRE') && names.includes('UNIDADES') && names.includes('IMPORTE') && names.includes('NETO')) {
      results.items.push({ file: f, mtime, numRecords });
    } else if (names.includes('RUBRO') && names.includes('NOMRUB') && names.includes('VENTA')) {
      results.rubros.push({ file: f, mtime, numRecords });
    } else if (names.includes('H_12') && names.includes('DIA')) {
      results.hourly.push({ file: f, mtime, numRecords, rows: readRows(35) });
    }
  } catch (e) {}
}

console.log('=== CONCEPT FILES (Ventas por Concepto) ===');
results.concept.forEach(c => {
  console.log(`\nFile: ${c.file} (Modified: ${c.mtime}, ${c.numRecords} recs)`);
  c.rows.forEach(r => console.log('  ', r.FECHA, 'Total:', r.TOTAL, 'Cub:', r.CUB, 'Ventas:', r.VENTAS, 'Salon:', r.SALON, 'Mostrador:', r.MOSTRADOR, 'Domicilio:', r.DOMICILIO));
});

console.log('\n=== PAYMENT FILES (Ventas por Medio de Pago) ===');
results.payments.forEach(p => {
  console.log(`File: ${p.file} (Modified: ${p.mtime}) -> Total: ${p.total}, Ventas: ${p.ventas}`);
});

console.log('\n=== HOURLY FILES ===');
results.hourly.forEach(h => {
  console.log(`File: ${h.file} (Modified: ${h.mtime}, ${h.numRecords} recs)`);
  h.rows.forEach(r => console.log('  ', r.DIA, r.FECHA));
});
