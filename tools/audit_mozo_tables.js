const fs = require('fs');

function parseMozoDetailedDbf(filePath) {
  const buf = fs.readFileSync(filePath);
  const numRecs = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recLen = buf.readUInt16LE(10);
  
  const mozos = {};
  let totalFact = 0;
  let dateFound = null;
  
  for (let i = 0; i < numRecs; i++) {
    const off = headerLen + i * recLen;
    if (buf[off] === 0x2A) continue;
    
    const fecha = buf.slice(off + 1, off + 9).toString('ascii').trim();
    const comp = buf.slice(off + 29, off + 49).toString('ascii').trim();
    const codMozo = parseInt(buf.slice(off + 53, off + 58).toString('ascii').trim(), 10) || 0;
    const nomMozo = buf.slice(off + 58, off + 88).toString('latin1').trim();
    const nomArt = buf.slice(off + 181, off + 211).toString('latin1').trim();
    const cant = parseFloat(buf.slice(off + 211, off + 220).toString('ascii').trim()) || 0;
    const tot = parseFloat(buf.slice(off + 230, off + 240).toString('ascii').trim()) || 0;
    
    dateFound = fecha;
    if (!mozos[codMozo]) {
      mozos[codMozo] = { codigo: codMozo, nombre: nomMozo, total: 0, comprobantes: new Set(), cubiertos: 0 };
    }
    mozos[codMozo].total += tot;
    mozos[codMozo].comprobantes.add(comp);
    if (nomArt.toUpperCase().includes('CUBIERTO')) {
      mozos[codMozo].cubiertos += Math.round(cant);
    }
    totalFact += tot;
  }
  return { filePath, dateFound, totalFact, mozos };
}

['39122690.dbf', '42412338.dbf', '39076206.dbf', 'Informe.DBF'].forEach(f => {
  const res = parseMozoDetailedDbf('C:/MaxiRest/' + f);
  console.log('====================================================');
  console.log('File:', f, 'Date:', res.dateFound, 'Total Facturado:', res.totalFact.toLocaleString('es-AR'));
  console.log('Mozos:');
  Object.values(res.mozos).sort((a,b)=>b.total-a.total).forEach(m => {
    console.log('  #' + m.codigo + ' ' + m.nombre + ': $' + m.total.toLocaleString('es-AR') + ' | ' + m.comprobantes.size + ' tks | ' + m.cubiertos + ' cub');
  });
});
