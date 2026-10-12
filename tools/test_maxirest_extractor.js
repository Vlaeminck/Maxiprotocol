const fs = require('fs');
const path = require('path');

console.log('=== TESTEANDO EXTRACTOR NATIVO DE MAXIREST (DBF) ===\n');

const DB_DIR = 'C:\\MaxiRest';

// Función para parsear cabecera y registros DBF
function parseDbf(filePath, maxRecords = 5000, reverse = false) {
  const fd = fs.openSync(filePath, 'r');
  const headerBuf = Buffer.alloc(32);
  fs.readSync(fd, headerBuf, 0, 32, 0);

  const numRecords = headerBuf.readUInt32LE(4);
  const headerLen = headerBuf.readUInt16LE(8);
  const recordLen = headerBuf.readUInt16LE(10);

  const fieldsBuf = Buffer.alloc(headerLen - 32);
  fs.readSync(fd, fieldsBuf, 0, headerLen - 32, 32);

  const fields = [];
  for (let offset = 0; offset + 32 <= fieldsBuf.length; offset += 32) {
    if (fieldsBuf[offset] === 0x0D) break;
    const fieldName = fieldsBuf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
    const fieldType = String.fromCharCode(fieldsBuf[offset + 11]);
    const fieldLen = fieldsBuf[offset + 16];
    fields.push({ name: fieldName, type: fieldType, len: fieldLen });
  }

  const records = [];
  const recBuf = Buffer.alloc(recordLen);
  const countToRead = Math.min(numRecords, maxRecords);

  const startIdx = reverse ? Math.max(0, numRecords - countToRead) : 0;
  const endIdx = reverse ? numRecords : countToRead;

  for (let r = startIdx; r < endIdx; r++) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + (r * recordLen));
    // Byte 0 es marca de borrado ('*' = borrado, ' ' = activo)
    if (recBuf[0] === 0x2A) continue;

    const row = {};
    let recOff = 1;
    fields.forEach(f => {
      row[f.name] = recBuf.toString('latin1', recOff, recOff + f.len).trim();
      recOff += f.len;
    });
    records.push(row);
  }

  fs.closeSync(fd);
  return { numRecords, fields, records };
}

// 1. Extraer artículos y rubros reales desde 45294870.dbf (últimos 10,000 registros para datos recientes)
console.log('1. Extrayendo comandas, artículos y mozos recientes de 45294870.dbf...');
const itemsData = parseDbf(path.join(DB_DIR, '45294870.dbf'), 15000, true);
console.log(`Leídos ${itemsData.records.length} registros recientes de 45294870.dbf.`);

// Extraer rubros y artículos únicos
const rubrosMap = {};
const mozosMap = {};
const articulosMap = {};
const mesasMap = {};

itemsData.records.forEach(row => {
  const rubro = row.NOMBRUA || 'Otros';
  const articulo = row.NOMBREART;
  const mozo = row.NOMBREMOZ || 'SIN MOZO';
  const mesa = row.MESA || '1';
  const total = parseFloat(row.TOTAL) || 0;
  const cant = parseFloat(row.CANTIDAD) || 1;
  const punit = parseFloat(row.PUNIT) || 0;

  // Rubros
  rubrosMap[rubro] = (rubrosMap[rubro] || 0) + total;

  // Mozos
  if (!mozosMap[mozo]) {
    mozosMap[mozo] = { nombre: mozo, ventas: 0, mesasAtendidas: new Set() };
  }
  mozosMap[mozo].ventas += total;
  mozosMap[mozo].mesasAtendidas.add(mesa);

  // Artículos
  if (articulo && !articulosMap[articulo]) {
    articulosMap[articulo] = { descripcion: articulo, rubro, precio: punit };
  }

  // Mesas
  if (!mesasMap[mesa]) {
    mesasMap[mesa] = { numero: mesa, total: 0, items: [], mozo };
  }
  mesasMap[mesa].total += total;
  if (mesasMap[mesa].items.length < 6) {
    mesasMap[mesa].items.push({
      descripcion: articulo,
      rubro,
      cantidad: cant,
      precioUnitario: punit,
      subtotal: total
    });
  }
});

console.log('\n--- RUBROS DETECTADOS ---');
console.log(Object.keys(rubrosMap).map(r => `${r}: $${Math.round(rubrosMap[r]).toLocaleString('es-AR')}`).join('\n'));

console.log('\n--- TOP MOZOS REALES ---');
const topMozos = Object.values(mozosMap)
  .map(m => ({ nombre: m.nombre, ventas: Math.round(m.ventas), mesas: m.mesasAtendidas.size }))
  .sort((a, b) => b.ventas - a.ventas)
  .slice(0, 8);
console.log(topMozos);

console.log('\n--- MUESTRA DE ARTÍCULOS ---');
console.log(Object.values(articulosMap).slice(0, 10));

console.log('\n--- MUESTRA DE MESAS CON ACTIVIDAD ---');
const sampleMesas = Object.values(mesasMap).slice(0, 5);
console.log(JSON.stringify(sampleMesas, null, 2));
