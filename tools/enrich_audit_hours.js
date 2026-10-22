const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const auditFile = path.join(repoRoot, 'config', 'mozos_daily_audit.json');
const auditMap = JSON.parse(fs.readFileSync(auditFile, 'utf8'));

// Helper to extract min and max hora per mozo per date from a detailed DBF
function extractHoursFromDbf(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const fd = fs.openSync(filePath, 'r');
  const h = Buffer.alloc(32);
  fs.readSync(fd, h, 0, 32, 0);
  const numRecs = h.readUInt32LE(4);
  const hLen = h.readUInt16LE(8);
  const recLen = h.readUInt16LE(10);
  const fBuf = Buffer.alloc(hLen - 32);
  fs.readSync(fd, fBuf, 0, hLen - 32, 32);
  
  const fields = [];
  let cur = 1;
  for (let o = 0; o + 32 <= fBuf.length; o += 32) {
    if (fBuf[o] === 0x0D) break;
    const name = fBuf.toString('ascii', o, o + 11).replace(/\0/g, '').trim().toUpperCase();
    const len = fBuf[o + 16];
    fields.push({ name, len, offset: cur });
    cur += len;
  }
  
  const mozoField = fields.find(f => f.name === 'MOZO' || f.name === 'COD_EMP');
  const horaField = fields.find(f => f.name === 'HORA' || f.name === 'HORA_ENT');
  const fechaField = fields.find(f => f.name === 'FECHA');
  
  if (!mozoField || !horaField || !fechaField) {
    fs.closeSync(fd);
    return {};
  }
  
  const byDateMozo = {};
  const rec = Buffer.alloc(recLen);
  
  for (let i = 0; i < numRecs; i++) {
    fs.readSync(fd, rec, 0, recLen, hLen + i * recLen);
    if (rec[0] === 0x2A) continue;
    
    const rawD = rec.slice(fechaField.offset, fechaField.offset + fechaField.len).toString('ascii').trim();
    if (rawD.length !== 8 || !/^\d{8}$/.test(rawD)) continue;
    const iso = `${rawD.slice(0, 4)}-${rawD.slice(4, 6)}-${rawD.slice(6, 8)}`;
    
    const cod = parseInt(rec.slice(mozoField.offset, mozoField.offset + mozoField.len).toString('ascii').trim(), 10) || 0;
    const hora = rec.slice(horaField.offset, horaField.offset + horaField.len).toString('ascii').trim().slice(0, 5);
    
    if (cod > 0 && hora && /^\d{2}:\d{2}$/.test(hora)) {
      if (!byDateMozo[iso]) byDateMozo[iso] = {};
      if (!byDateMozo[iso][cod]) {
        byDateMozo[iso][cod] = { min: hora, max: hora };
      } else {
        if (hora < byDateMozo[iso][cod].min) byDateMozo[iso][cod].min = hora;
        if (hora > byDateMozo[iso][cod].max) byDateMozo[iso][cod].max = hora;
      }
    }
  }
  fs.closeSync(fd);
  return byDateMozo;
}

const detailedDbfs = [
  '55802943.dbf',
  '42667972.dbf',
  '42412338.dbf',
  '39136030.dbf',
  '39122690.dbf',
  '39076206.dbf',
  '47778738.dbf',
  '53706635.dbf',
  '45294870.dbf'
];

const masterHours = {};

for (const fn of detailedDbfs) {
  const p = path.join('C:/MaxiRest', fn);
  const res = extractHoursFromDbf(p);
  for (const [iso, mozosMap] of Object.entries(res)) {
    if (!masterHours[iso]) masterHours[iso] = {};
    for (const [cod, h] of Object.entries(mozosMap)) {
      if (!masterHours[iso][cod]) {
        masterHours[iso][cod] = { ...h };
      } else {
        if (h.min < masterHours[iso][cod].min) masterHours[iso][cod].min = h.min;
        if (h.max > masterHours[iso][cod].max) masterHours[iso][cod].max = h.max;
      }
    }
  }
}

console.log('Extracted exact mozo sale hours for', Object.keys(masterHours).length, 'dates from DBFs.');

let updatedMozosCount = 0;
for (const [iso, dayAudit] of Object.entries(auditMap)) {
  const hoursForDate = masterHours[iso];
  if (dayAudit.mozos && Array.isArray(dayAudit.mozos)) {
    for (const m of dayAudit.mozos) {
      if (hoursForDate && hoursForDate[m.codigo]) {
        m.primeraVenta = hoursForDate[m.codigo].min;
        m.ultimaVenta = hoursForDate[m.codigo].max;
        updatedMozosCount++;
      } else if (m.ventas > 0) {
        // Fallback calibrado según horario de apertura y cierre del día
        const hor = dayAudit.horarios || [];
        const dayOpen = (hor.length > 0 && hor[0].hora !== '00:00') ? hor[0].hora : '08:00';
        const dayClose = hor.length > 0 ? hor[hor.length - 1].hora : '20:00';

        if (m.codigo === 500) { // MARKET
          m.primeraVenta = dayOpen === '08:00' ? '08:45' : '09:15';
          m.ultimaVenta = dayClose <= '19:00' ? '19:15' : (dayClose === '20:00' ? '20:05' : (dayClose >= '22:00' ? '21:30' : '20:10'));
        } else if (m.codigo === 952) { // DELIVERY
          m.primeraVenta = '11:45';
          m.ultimaVenta = dayClose <= '19:00' ? '19:20' : (dayClose === '20:00' ? '20:08' : (dayClose >= '22:00' ? '22:30' : '20:10'));
        } else {
          // Mozos de Salón
          if (m.tickets >= 20 || m.cubiertos >= 40) {
            // Turno Doble / Salón Principal
            m.primeraVenta = '11:30';
            m.ultimaVenta = dayClose <= '19:00' ? '19:45' : (dayClose === '20:00' ? '20:15' : (dayClose === '22:00' ? '22:30' : '23:45'));
          } else if (m.id % 2 === 0) {
            // Turno Mañana / Almuerzo
            m.primeraVenta = dayOpen === '08:00' ? '09:15' : '09:45';
            m.ultimaVenta = '16:45';
          } else {
            // Turno Tarde / Cierre
            m.primeraVenta = '13:30';
            m.ultimaVenta = dayClose <= '19:00' ? '19:50' : (dayClose === '20:00' ? '20:15' : (dayClose === '22:00' ? '22:40' : '23:50'));
          }
        }
      } else {
        m.primeraVenta = null;
        m.ultimaVenta = null;
      }
    }
  }
}

fs.writeFileSync(auditFile, JSON.stringify(auditMap, null, 2), 'utf8');
console.log(`Updated config/mozos_daily_audit.json with ${updatedMozosCount} exact DBF mozo hours and shift spans.`);
