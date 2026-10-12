const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiRest';

function inspectDbf(fileName) {
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return;
  try {
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
      fields.push(fieldName);
    }

    const recBuf = Buffer.alloc(recordLen);
    const records = [];
    for (let r = 0; r < Math.min(numRecords, 5); r++) {
      fs.readSync(fd, recBuf, 0, recordLen, headerLen + (r * recordLen));
      records.push(recBuf.toString('latin1').substring(1, 120).trim());
    }
    fs.closeSync(fd);

    console.log(`\n📁 ${fileName} (${numRecords} registros)`);
    console.log(`   Campos: ${fields.join(', ')}`);
    console.log(`   Muestra:`, records.slice(0, 2));
  } catch (e) {}
}

const octFiles = [
  '37034789.dbf',
  '36715117.dbf',
  '32844522.dbf',
  '32315984.dbf',
  '42598591.dbf',
  '42456716.dbf',
  '42440946.dbf',
  '41790944.dbf',
  '41784801.dbf',
  '35436379.dbf'
];

octFiles.forEach(inspectDbf);
