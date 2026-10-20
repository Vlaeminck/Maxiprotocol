const fs = require('fs');

function dumpRecords(filePath, limit = 10) {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  let offset = 32;
  const fields = [];
  while (offset < headerLen - 1 && offset < buf.length) {
    if (buf[offset] === 0x0D) break;
    const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
    const len = buf[offset + 16];
    fields.push({ name, len });
    offset += 32;
  }
  console.log('=== FILE:', filePath, 'Records:', numRecords, 'Fields:', fields.map(f => f.name).join(', '));
  let recOff = headerLen;
  for (let idx = 0; idx < Math.min(numRecords, limit); idx++) {
    const row = {};
    let cur = recOff + 1;
    fields.forEach(f => {
      row[f.name] = buf.slice(cur, cur + f.len).toString('latin1').trim();
      cur += f.len;
    });
    console.log(`[${idx}]:`, row);
    recOff += recordLen;
  }
}

['34539117.dbf', '34501392.dbf', '33865379.dbf', '33859030.dbf', '33371579.dbf', '33015712.dbf'].forEach(f => {
  dumpRecords('C:/MaxiRest/' + f, 8);
});
