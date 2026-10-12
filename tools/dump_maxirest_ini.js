const fs = require('fs');

const buf = fs.readFileSync('C:\\MaxiRest\\MaxiREST.ini');
console.log('Size:', buf.length);

// DBF format: header is at byte 0
const numRecords = buf.readUInt32LE(4);
const headerLen = buf.readUInt16LE(8);
const recordLen = buf.readUInt16LE(10);
console.log(`Records: ${numRecords}, Header: ${headerLen}, RecordLen: ${recordLen}`);

let offset = headerLen;
for (let i = 0; i < numRecords; i++) {
  const row = buf.slice(offset, offset + recordLen).toString('latin1');
  console.log(`[${i}]: ${row.trim()}`);
  offset += recordLen;
}
