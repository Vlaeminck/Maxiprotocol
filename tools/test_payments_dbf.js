const fs = require('fs');
const path = require('path');

const DB_DIR = 'C:\\MaxiRest';

function parseDbfQuick(filePath, maxRecords = 100) {
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
  for (let r = 0; r < Math.min(numRecords, maxRecords); r++) {
    fs.readSync(fd, recBuf, 0, recordLen, headerLen + (r * recordLen));
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

console.log('--- 61301771.dbf (Medios de Pago) ---');
const pagos = parseDbfQuick(path.join(DB_DIR, '61301771.dbf'), 10);
console.log(pagos.records);

console.log('\n--- 43645383.dbf (Ventas por Salón, Mostrador, Delivery) ---');
const canales = parseDbfQuick(path.join(DB_DIR, '43645383.dbf'), 10);
console.log(canales.records);
