const fs = require('fs');
const path = require('path');
const dir = 'C:/MaxiRest';

const octoberMap = {
  '2026-10-01': '32828174.dbf',
  '2026-10-02': '34354746.dbf',
  '2026-10-05': '35672286.dbf',
  '2026-10-06': '32838000.dbf',
  '2026-10-07': '29294376.dbf',
  '2026-10-08': '42598591.dbf',
  '2026-10-09': '32844522.dbf',
  '2026-10-10': '40694411.dbf',
  '2026-10-11': '37034789.dbf',
  '2026-10-12': '49412808.dbf'
};

for (const [date, file] of Object.entries(octoberMap)) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) {
    console.log(date, file, 'NOT FOUND');
    continue;
  }
  const buf = fs.readFileSync(full);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  
  let totalFacturado = 0;
  let totalTickets = 0;
  const medios = {};
  
  for (let r = 0; r < numRecords; r++) {
    const line = buf.slice(headerLen + r * recordLen, headerLen + (r + 1) * recordLen).toString('latin1');
    const mTotal = line.match(/02\s+TOTAL\s+(\d+\.\d{2})\s+(\d+)/);
    if (mTotal) {
      totalFacturado = parseFloat(mTotal[1]);
      totalTickets = parseInt(mTotal[2]);
    }
    const mMedio = line.match(/01-([A-Za-z0-9\*\/\-]+)\s+([A-Za-z0-9\s\*\/\-]+?)\s+(\d+\.\d{2})\s+(\d+)/);
    if (mMedio) {
      const name = mMedio[2].replace(/[\*\/]/g, '').trim();
      const imp = parseFloat(mMedio[3]);
      if (name && imp > 0 && name !== 'TOTAL' && name !== 'RESUMEN') {
        medios[name] = imp;
      }
    }
  }
  console.log(date, 'File:', file, 'Total:', totalFacturado, 'Tickets:', totalTickets, 'Medios:', Object.keys(medios).join(', '));
}
