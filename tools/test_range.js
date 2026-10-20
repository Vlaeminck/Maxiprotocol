const fs = require('fs');

const p = 'C:\\MaxiRest\\45294870.dbf';
if (!fs.existsSync(p)) {
  console.log('File does not exist:', p);
  process.exit(1);
}

const fd = fs.openSync(p, 'r');
const bufHead = Buffer.alloc(32);
fs.readSync(fd, bufHead, 0, 32, 0);
const numRecords = bufHead.readUInt32LE(4);
const headerLen = bufHead.readUInt16LE(8);
const recordLen = bufHead.readUInt16LE(10);

console.log('Opened DBF with', numRecords, 'records.');

// Q3 2026: 20260701 to 20260930
const fromDate = '20260701';
const toDate = '20260930';

const dishSales = {};
const categorySales = {};
const hourlySales = {};
const dailySales = {};

const recBuf = Buffer.alloc(recordLen);
let matchCount = 0;

for (let r = 0; r < numRecords; r++) {
  const off = headerLen + r * recordLen;
  fs.readSync(fd, recBuf, 0, recordLen, off);
  if (recBuf[0] === 0x2A) continue; // deleted
  
  const fecha = recBuf.slice(1, 9).toString('latin1').trim();
  if (fecha >= fromDate && fecha <= toDate) {
    matchCount++;
    const hora = recBuf.slice(9, 14).toString('latin1').trim(); // HH:MM
    const mozoNom = recBuf.slice(58, 88).toString('latin1').trim() || 'SIN ASIGNAR';
    const rubro = recBuf.slice(92, 132).toString('latin1').trim() || 'OTROS';
    const artCod = recBuf.slice(176, 181).toString('latin1').trim();
    const artNom = recBuf.slice(181, 211).toString('latin1').trim();
    const cant = parseFloat(recBuf.slice(211, 220).toString('latin1').trim()) || 0;
    const punit = parseFloat(recBuf.slice(220, 230).toString('latin1').trim()) || 0;
    const total = parseFloat(recBuf.slice(230, 240).toString('latin1').trim()) || (cant * punit);

    // Filter out generic system line items if needed (like MARCHAR, CUBIERTO, etc.) or keep them
    if (artNom && cant > 0 && !artNom.startsWith('MARCHAR')) {
      if (!dishSales[artNom]) {
        dishSales[artNom] = { codigo: artCod, nombre: artNom, rubro, unidades: 0, total: 0, mozos: {} };
      }
      dishSales[artNom].unidades += cant;
      dishSales[artNom].total += total;
      dishSales[artNom].mozos[mozoNom] = (dishSales[artNom].mozos[mozoNom] || 0) + cant;

      categorySales[rubro] = (categorySales[rubro] || 0) + total;

      const h = hora ? hora.split(':')[0] : '12';
      hourlySales[h] = (hourlySales[h] || 0) + cant;
      dailySales[fecha] = (dailySales[fecha] || 0) + total;
    }
  }
}
fs.closeSync(fd);

console.log('Total sales records in Q3 2026 (Jul-Sep 2026):', matchCount);
const topDishes = Object.values(dishSales).sort((a,b) => b.unidades - a.unidades).slice(0, 15);
console.log('\n--- TOP 15 PLATOS MÁS VENDIDOS (ÚLTIMO TRIMESTRE JUL-SEP 2026) ---');
topDishes.forEach((d, i) => {
  const topMozo = Object.entries(d.mozos).sort((a,b) => b[1] - a[1])[0] || ['N/A', 0];
  console.log(`${i+1}. ${d.nombre} [${d.rubro}] -> ${d.unidades} u. | $${Math.round(d.total).toLocaleString()} | Top Mozo: ${topMozo[0]} (${topMozo[1]} u.)`);
});

console.log('\n--- VENTAS POR CATEGORÍA / RUBRO ---');
Object.entries(categorySales).sort((a,b) => b[1] - a[1]).forEach(([cat, tot]) => {
  console.log(`- ${cat}: $${Math.round(tot).toLocaleString()}`);
});

console.log('\n--- VENTAS POR FRANJA HORARIA ---');
Object.entries(hourlySales).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([h, units]) => {
  console.log(`${h}:00 - ${units} unidades`);
});
