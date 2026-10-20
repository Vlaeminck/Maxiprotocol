const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiRest/Informe.DBF');
const numRecs = buf.readUInt32LE(4);
const headerLen = buf.readUInt16LE(8);
const recLen = buf.readUInt16LE(10);

const mozos = {};
let grandTotal = 0;

for (let i = 0; i < numRecs; i++) {
  const off = headerLen + i * recLen;
  if (buf[off] === 0x2A) continue; // deleted
  
  const fecha = buf.slice(off + 1, off + 9).toString('ascii').trim();
  const hora = buf.slice(off + 9, off + 14).toString('ascii').trim();
  const comp = buf.slice(off + 29, off + 49).toString('ascii').trim();
  const mesa = buf.slice(off + 49, off + 53).toString('ascii').trim();
  const codMozo = parseInt(buf.slice(off + 53, off + 58).toString('ascii').trim(), 10) || 0;
  const nomMozo = buf.slice(off + 58, off + 88).toString('latin1').trim();
  const codArt = parseInt(buf.slice(off + 176, off + 181).toString('ascii').trim(), 10) || 0;
  const nomArt = buf.slice(off + 181, off + 211).toString('latin1').trim();
  const cant = parseFloat(buf.slice(off + 211, off + 220).toString('ascii').trim()) || 0;
  const punit = parseFloat(buf.slice(off + 220, off + 230).toString('ascii').trim()) || 0;
  const tot = parseFloat(buf.slice(off + 230, off + 240).toString('ascii').trim()) || 0;

  if (!mozos[codMozo]) {
    mozos[codMozo] = {
      codigo: codMozo,
      nombre: nomMozo,
      total: 0,
      items: 0,
      comprobantes: new Set(),
      cubiertos: 0,
      articulos: {}
    };
  }
  mozos[codMozo].total += tot;
  mozos[codMozo].items += cant;
  mozos[codMozo].comprobantes.add(comp);
  if (nomArt.toUpperCase().includes('CUBIERTO')) {
    mozos[codMozo].cubiertos += Math.round(cant);
  }
  mozos[codMozo].articulos[nomArt] = (mozos[codMozo].articulos[nomArt] || 0) + cant;
  grandTotal += tot;
}

console.log('=== RESUMEN AUDITADO DE INFORME.DBF (07/10/2026) ===');
console.log('Total Facturado Salón: $' + grandTotal.toLocaleString('es-AR'));
console.log('Total Comprobantes (tickets):', new Set(Object.values(mozos).flatMap(m => Array.from(m.comprobantes))).size);
console.log('Total Cubiertos (CUB):', Object.values(mozos).reduce((s, m) => s + m.cubiertos, 0));
console.log('----------------------------------------------------');

Object.values(mozos).sort((a,b) => b.total - a.total).forEach(m => {
  const topArt = Object.entries(m.articulos).sort((a,b) => b[1] - a[1])[0] || ['-', 0];
  console.log(`Mozo #${m.codigo} ${m.nombre}:`);
  console.log(`   Ventas: $${m.total.toLocaleString('es-AR')} | Tickets: ${m.comprobantes.size} | Cubiertos: ${m.cubiertos} cub`);
  console.log(`   Plato Top: ${topArt[0]} (${topArt[1]} u.)`);
});
