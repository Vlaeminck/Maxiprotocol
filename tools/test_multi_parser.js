const fs = require('fs');
const path = require('path');

function parseMultiDateDetailedDbf(filePath) {
  const buf = fs.readFileSync(filePath);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  let curOff = 1;
  const fields = [];
  for (let o = 32; o < headerLen - 1 && buf[o] !== 0x0D; o += 32) {
    fields.push({
      name: buf.toString('ascii', o, o + 11).replace(/\0/g, '').trim().toUpperCase(),
      len: buf[o + 16]
    });
  }

  let fechaOff = -1, fechaLen = 0;
  let horaOff = -1, horaLen = 0;
  let compOff = -1, compLen = 0;
  let mozoOff = -1, mozoLen = 0;
  let nomMozoOff = -1, nomMozoLen = 0;
  let nomRuaOff = -1, nomRuaLen = 0;
  let codArtOff = -1, codArtLen = 0;
  let nomArtOff = -1, nomArtLen = 0;
  let cantOff = -1, cantLen = 0;
  let punitOff = -1, punitLen = 0;
  let totalOff = -1, totalLen = 0;

  for (const f of fields) {
    if (f.name === 'FECHA') { fechaOff = curOff; fechaLen = f.len; }
    else if (f.name === 'HORA') { horaOff = curOff; horaLen = f.len; }
    else if (f.name === 'COMPROBANT' || f.name === 'COMPROB') { compOff = curOff; compLen = f.len; }
    else if (f.name === 'MOZO' || f.name === 'COD_MOZ') { mozoOff = curOff; mozoLen = f.len; }
    else if (f.name === 'NOMBREMOZ') { nomMozoOff = curOff; nomMozoLen = f.len; }
    else if (f.name === 'NOMBRUA' || f.name === 'NOMRUB') { nomRuaOff = curOff; nomRuaLen = f.len; }
    else if (f.name === 'CODIGO' || f.name === 'COD_ART') { codArtOff = curOff; codArtLen = f.len; }
    else if (f.name === 'NOMBREART' || f.name === 'NOMART') { nomArtOff = curOff; nomArtLen = f.len; }
    else if (f.name === 'CANTIDAD') { cantOff = curOff; cantLen = f.len; }
    else if (f.name === 'PUNIT' || f.name === 'PRECIO') { punitOff = curOff; punitLen = f.len; }
    else if (f.name === 'TOTAL') { totalOff = curOff; totalLen = f.len; }
    curOff += f.len;
  }

  const byDate = {};
  for (let r = 0; r < numRecords; r++) {
    const off = headerLen + r * recordLen;
    if (buf[off] === 0x2A) continue;

    const rawDate = buf.slice(off + fechaOff, off + fechaOff + fechaLen).toString('ascii').trim();
    if (!/^\d{8}$/.test(rawDate)) continue;
    const dateKey = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;

    if (!byDate[dateKey]) {
      byDate[dateKey] = {
        rubros: {},
        mozos: {},
        productos: {},
        horarios: {},
        comprobantes: new Set(),
        totalFacturado: 0
      };
    }

    const dObj = byDate[dateKey];
    const tot = parseFloat(buf.slice(off + totalOff, off + totalOff + totalLen).toString('ascii').trim()) || 0;
    const cant = parseFloat(buf.slice(off + cantOff, off + cantOff + cantLen).toString('ascii').trim()) || 0;
    const punit = parseFloat(buf.slice(off + punitOff, off + punitOff + punitLen).toString('ascii').trim()) || 0;
    const nomRua = buf.slice(off + nomRuaOff, off + nomRuaOff + nomRuaLen).toString('latin1').trim();
    const codArt = buf.slice(off + codArtOff, off + codArtOff + codArtLen).toString('ascii').trim();
    const nomArt = buf.slice(off + nomArtOff, off + nomArtOff + nomArtLen).toString('latin1').trim();
    const codMoz = parseInt(buf.slice(off + mozoOff, off + mozoOff + mozoLen).toString('ascii').trim(), 10) || 0;
    const nomMoz = buf.slice(off + nomMozoOff, off + nomMozoOff + nomMozoLen).toString('latin1').trim();
    const comp = compOff !== -1 ? buf.slice(off + compOff, off + compOff + compLen).toString('ascii').trim() : '';
    const hora = horaOff !== -1 ? buf.slice(off + horaOff, off + horaOff + horaLen).toString('ascii').trim() : '';

    dObj.totalFacturado += tot;
    if (comp) dObj.comprobantes.add(comp);

    if (nomRua) {
      dObj.rubros[nomRua] = (dObj.rubros[nomRua] || 0) + tot;
    }

    const isCubierto = nomArt.toUpperCase().includes('CUBIERTO') || codArt === '4031';
    if (nomArt && !isCubierto && !nomArt.toUpperCase().includes('INEXISTENTE')) {
      if (!dObj.productos[nomArt]) {
        dObj.productos[nomArt] = { codigo: codArt || 'ART', nombre: nomArt, rubro: nomRua, unidades: 0, facturado: 0, unitario: punit };
      }
      dObj.productos[nomArt].unidades += cant;
      dObj.productos[nomArt].facturado += tot;
    }

    if (codMoz > 0) {
      if (!dObj.mozos[codMoz]) {
        dObj.mozos[codMoz] = { codigo: codMoz, nombre: nomMoz, total: 0, comprobantes: new Set(), cubiertos: 0 };
      }
      dObj.mozos[codMoz].total += tot;
      if (comp) dObj.mozos[codMoz].comprobantes.add(comp);
      if (isCubierto) dObj.mozos[codMoz].cubiertos += Math.round(cant);
    }

    if (hora) {
      const hh = hora.split(':')[0] + ':00';
      if (!dObj.horarios[hh]) dObj.horarios[hh] = { hora: hh, importe: 0, tickets: 0 };
      dObj.horarios[hh].importe += tot;
      dObj.horarios[hh].tickets += 1;
    }
  }

  return byDate;
}

const parsed = parseMultiDateDetailedDbf('C:/MaxiRest/Informe.DBF');
console.log('Fechas procesadas desde Informe.DBF:', Object.keys(parsed));
for (const [dk, d] of Object.entries(parsed)) {
  console.log(`- ${dk}: Total $${d.totalFacturado.toLocaleString()} | Tickets: ${d.comprobantes.size} | Rubros: ${Object.keys(d.rubros).length} | Mozos: ${Object.keys(d.mozos).length} | Horas: ${Object.keys(d.horarios).length}`);
}
