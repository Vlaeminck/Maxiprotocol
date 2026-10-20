const fs = require('fs');

function inspectMozoDetails(filePath) {
  const buf = fs.readFileSync(filePath);
  const headerLen = buf.readUInt16LE(8);
  const recLen = buf.readUInt16LE(10);
  const numRecs = buf.readUInt32LE(4);

  const mozoDishes = {};
  for (let i = 0; i < numRecs; i++) {
    const off = headerLen + i * recLen;
    if (buf[off] === 0x2A) continue;
    const nomMozo = buf.slice(off + 58, off + 88).toString('latin1').trim();
    const nomRub = buf.slice(off + 92, off + 132).toString('latin1').trim() || 'OTROS';
    const nomArt = buf.slice(off + 181, off + 211).toString('latin1').trim();
    const cant = parseFloat(buf.slice(off + 211, off + 220).toString('ascii').trim()) || 0;
    const tot = parseFloat(buf.slice(off + 230, off + 240).toString('ascii').trim()) || 0;
    if (!nomMozo || nomMozo === 'VACIO') continue;

    if (!mozoDishes[nomMozo]) mozoDishes[nomMozo] = {};
    if (!mozoDishes[nomMozo][nomRub]) mozoDishes[nomMozo][nomRub] = { totalCant: 0, totalImp: 0, items: {} };
    mozoDishes[nomMozo][nomRub].totalCant += cant;
    mozoDishes[nomMozo][nomRub].totalImp += tot;
    if (!mozoDishes[nomMozo][nomRub].items[nomArt]) mozoDishes[nomMozo][nomRub].items[nomArt] = { cant: 0, tot: 0 };
    mozoDishes[nomMozo][nomRub].items[nomArt].cant += cant;
    mozoDishes[nomMozo][nomRub].items[nomArt].tot += tot;
  }
  return mozoDishes;
}

const dishes = inspectMozoDetails('C:/MaxiRest/39122690.dbf');
console.log('Mozos:', Object.keys(dishes));
for (const [mozo, rubs] of Object.entries(dishes)) {
  console.log(`\n=================== ${mozo} ===================`);
  for (const [rub, data] of Object.entries(rubs)) {
    console.log(`📂 [${rub}] Total: ${data.totalCant} u. | $${data.totalImp.toLocaleString('es-AR')}`);
    const sorted = Object.entries(data.items).sort((a,b) => b[1].cant - a[1].cant);
    sorted.forEach(([item, iData]) => {
      console.log(`   └─ ${item}: ${iData.cant} u. ($${iData.tot.toLocaleString('es-AR')})`);
    });
  }
}
