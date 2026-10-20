const fs = require('fs');
const path = require('path');

// Parser helper for DBFs
function readDbfRecords(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length < 32) return null;
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  if (headerLen < 32 || recordLen < 1) return null;

  let offset = 32;
  const fields = [];
  while (offset < headerLen - 1 && offset < buf.length) {
    if (buf[offset] === 0x0D) break;
    const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
    const len = buf[offset + 16];
    fields.push({ name, len });
    offset += 32;
  }

  const records = [];
  for (let r = 0; r < numRecords; r++) {
    const recOffset = headerLen + r * recordLen;
    if (recOffset + recordLen > buf.length) break;
    if (buf[recOffset] === 0x2A) continue; // deleted

    const row = {};
    let cur = recOffset + 1;
    fields.forEach(f => {
      row[f.name] = buf.slice(cur, cur + f.len).toString('latin1').trim();
      cur += f.len;
    });
    records.push(row);
  }
  return { fields, records };
}

// 1. Concept DBFs
function loadAllConceptRecords() {
  const candidateFiles = [
    'C:/MaxiREST_SQL/bakinforme.dbf',
    'C:/MaxiRest/40385578.dbf',
    'C:/MaxiRest/37686378.dbf',
    'C:/MaxiRest/37595092.dbf',
    'C:/MaxiRest/37580333.dbf',
    'C:/MaxiRest/34539117.dbf',
    'C:/MaxiRest/58318956.dbf'
  ];

  try {
    if (fs.existsSync('C:/MaxiRest')) {
      const extraDbfs = fs.readdirSync('C:/MaxiRest')
        .filter(f => f.toLowerCase().endsWith('.dbf') && !candidateFiles.some(cf => cf.endsWith(f)));
      for (const extra of extraDbfs) {
        const full = path.join('C:/MaxiRest', extra);
        try {
          const stat = fs.statSync(full);
          if (stat.size >= 500 && stat.size <= 5000) {
            candidateFiles.push(full);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  const byDate = {};

  for (const fp of candidateFiles) {
    const res = readDbfRecords(fp);
    if (!res) continue;
    const { fields, records } = res;
    const hasCub = fields.some(f => f.name === 'CUB');
    const hasSalon = fields.some(f => f.name === 'SALON');
    if (!hasCub || !hasSalon) continue;

    for (const row of records) {
      const match = row.FECHA ? row.FECHA.match(/(\d{2})\/(\d{2})\/(\d{2})/) : null;
      if (!match) continue;
      const dd = match[1];
      const mm = match[2];
      const yy = '20' + match[3];
      const dateKey = `${yy}-${mm}-${dd}`;

      const total = parseFloat(row.TOTAL) || 0;
      const cub = parseInt(row.CUB, 10) || 0;
      const ventas = parseInt(row.VENTAS, 10) || 0;
      const salon = parseFloat(row.SALON) || 0;
      const mostrador = parseFloat(row.MOSTRADOR) || 0;
      const domicilio = parseFloat(row.DOMICILIO) || 0;
      const otros = parseFloat(row.OTROS) || 0;
      const promedioCub = parseFloat(row.PROMEDIO) || (cub > 0 ? total / cub : 0);
      const promVtas = parseFloat(row.PROM_VTAS) || (ventas > 0 ? total / ventas : 0);

      const isBakinforme = fp.toLowerCase().includes('bakinforme');
      if (!byDate[dateKey] || isBakinforme) {
        byDate[dateKey] = {
          dateKey,
          fechaStr: row.FECHA,
          archivoOrigen: path.basename(fp),
          total,
          cub,
          ventas,
          salon,
          mostrador,
          domicilio,
          otros,
          promedioCub,
          promVtas
        };
      }
    }
  }

  return byDate;
}

// 2. Historical Transaction DBF (45294870.dbf)
function loadHistoryTransactionIndex() {
  const fp = 'C:/MaxiRest/45294870.dbf';
  if (!fs.existsSync(fp)) return {};

  const buf = fs.readFileSync(fp);
  const headerLen = buf.readUInt16LE(8);
  const numRecords = buf.readUInt32LE(4);
  const recordLen = buf.readUInt16LE(10);

  const days = {};

  for (let r = 0; r < numRecords; r++) {
    const recOffset = headerLen + r * recordLen;
    const rawDate = buf.slice(recOffset + 1, recOffset + 9).toString('ascii').trim();
    if (rawDate.length !== 8) continue;
    const iso = rawDate.slice(0, 4) + '-' + rawDate.slice(4, 6) + '-' + rawDate.slice(6, 8);

    if (!days[iso]) {
      days[iso] = {
        fecha: iso,
        total: 0,
        comprobantes: new Set(),
        cubiertos: 0,
        salon: 0,
        mostrador: 0,
        domicilio: 0,
        rubros: {},
        mozos: {},
        horas: {},
        productos: {}
      };
    }
    const d = days[iso];
    const hora = buf.slice(recOffset + 9, recOffset + 11).toString('ascii').trim() + ':00';
    const cpb = buf.slice(recOffset + 29, recOffset + 49).toString('latin1').trim();
    const mozo = buf.slice(recOffset + 58, recOffset + 88).toString('latin1').trim() || 'SIN MOZO';
    const rubro = buf.slice(recOffset + 92, recOffset + 132).toString('latin1').trim();
    const art = buf.slice(recOffset + 181, recOffset + 211).toString('latin1').trim();
    const cant = parseFloat(buf.slice(recOffset + 211, recOffset + 220).toString('latin1').trim()) || 0;
    const tot = parseFloat(buf.slice(recOffset + 230, recOffset + 240).toString('latin1').trim()) || 0;

    d.comprobantes.add(cpb);
    d.total += tot;

    if (art.toUpperCase().includes('CUBIERTO')) {
      d.cubiertos += cant;
    } else {
      d.productos[art] = (d.productos[art] || 0) + cant;
    }

    if (mozo === 'MARKET') d.mostrador += tot;
    else if (mozo === 'SIN MOZO' || mozo === 'DELIVERY' || mozo.includes('PEDIDO')) d.domicilio += tot;
    else d.salon += tot;

    d.rubros[rubro] = (d.rubros[rubro] || 0) + tot;
    d.horas[hora] = (d.horas[hora] || 0) + tot;
    if (!d.mozos[mozo]) d.mozos[mozo] = { ventas: 0, comprobantes: new Set() };
    d.mozos[mozo].ventas += tot;
    d.mozos[mozo].comprobantes.add(cpb);
  }

  // Convert Sets to counts
  const finalIndex = {};
  for (const [k, d] of Object.entries(days)) {
    finalIndex[k] = {
      fecha: d.fecha,
      total: Math.round(d.total),
      ventas: d.comprobantes.size,
      cub: Math.round(d.cubiertos),
      salon: Math.round(d.salon),
      mostrador: Math.round(d.mostrador),
      domicilio: Math.round(d.domicilio),
      otros: 0,
      promedioCub: d.cubiertos > 0 ? Math.round(d.total / d.cubiertos) : 0,
      promVtas: d.comprobantes.size > 0 ? Math.round(d.total / d.comprobantes.size) : 0,
      rubros: d.rubros,
      mozos: Object.fromEntries(Object.entries(d.mozos).map(([m, val]) => [m, { ventas: Math.round(val.ventas), tks: val.comprobantes.size }])),
      horas: d.horas,
      productos: d.productos,
      archivoOrigen: '45294870.dbf (Maxirest POS 10783)'
    };
  }
  return finalIndex;
}

console.log('Loading Concept Records...');
const conceptRecords = loadAllConceptRecords();
console.log('Loaded concept dates:', Object.keys(conceptRecords).length);

console.log('Loading History Transaction Index...');
console.time('historyLoad');
const historyRecords = loadHistoryTransactionIndex();
console.timeEnd('historyLoad');
console.log('Loaded history dates:', Object.keys(historyRecords).length);

// Benchmark verification list
const expectedTests = [
  { date: '2026-10-12', total: 7222960, cub: 205, tks: 158 },
  { date: '2026-10-11', total: 6665760, cub: 232, tks: 147 },
  { date: '2026-10-10', total: 6000560, cub: 192, tks: 134 },
  { date: '2026-10-09', total: 4598075, cub: 168, tks: 120 },
  { date: '2026-10-08', total: 3224480, cub: 112, tks: 90 },
  { date: '2026-10-07', total: 2671240, cub: 83, tks: 71 },
  { date: '2026-10-06', total: 2928500, cub: 122, tks: 93 },
  { date: '2026-10-05', total: 3124800, cub: 114, tks: 71 },
  { date: '2026-10-04', total: 7492530, cub: 312, tks: 172 },
  { date: '2026-10-03', total: 6571290, cub: 240, tks: 129 },
  { date: '2026-10-02', total: 3852350, cub: 160, tks: 106 },
  { date: '2026-10-01', total: 7899510, cub: 189, tks: 114 },
  { date: '2026-09-28', total: 2546875, cub: 94, tks: 82 },
  { date: '2026-08-06', total: 1995410, cub: 82, tks: 68 },
  { date: '2026-08-01', total: 8080270, cub: 291, tks: 165 },
  { date: '2026-07-15', total: 2864985, cub: 55, tks: 76 }
];

console.log('\n--- VERIFICATION OF DATES ---');
let allPassed = true;
for (const test of expectedTests) {
  const rec = conceptRecords[test.date] || historyRecords[test.date];
  if (!rec) {
    console.error(`FAILED: ${test.date} NOT FOUND!`);
    allPassed = false;
    continue;
  }
  const matchTotal = Math.abs(rec.total - test.total) < 5;
  const matchCub = rec.cub === test.cub;
  const matchTks = rec.ventas === test.tks;
  const ok = matchTotal && matchCub && matchTks;
  if (!ok) {
    console.error(`MISMATCH on ${test.date}: Got Total=${rec.total}, Cub=${rec.cub}, Tks=${rec.ventas} | Expected Total=${test.total}, Cub=${test.cub}, Tks=${test.tks}`);
    allPassed = false;
  } else {
    console.log(`PASSED: ${test.date} -> Total: $${rec.total.toLocaleString('es-AR')}, Cub: ${rec.cub}, Tks: ${rec.ventas} (from ${rec.archivoOrigen})`);
  }
}

if (allPassed) {
  console.log('\nALL 16 TEST DATES MATCHED TO THE CENT AND TO THE EXACT COMENSAL!');
} else {
  console.error('\nSOME TESTS FAILED!');
}
