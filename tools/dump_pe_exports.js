const fs = require('fs');

const buf = fs.readFileSync('C:\\MaxiADMIN\\CLAVE.DLL');
// Parse PE header to find export table
const peOffset = buf.readUInt32LE(0x3C);
const exportRva = buf.readUInt32LE(peOffset + 0x78);
const exportSize = buf.readUInt32LE(peOffset + 0x7C);

console.log(`PE Offset: ${peOffset}, Export RVA: ${exportRva}, Export Size: ${exportSize}`);

// Find section containing export RVA
const numSections = buf.readUInt16LE(peOffset + 0x06);
const optHeaderSize = buf.readUInt16LE(peOffset + 0x14);
let sectionOffset = peOffset + 0x18 + optHeaderSize;

let exportRaw = 0;
for (let i = 0; i < numSections; i++) {
  const virtAddr = buf.readUInt32LE(sectionOffset + 12);
  const rawAddr = buf.readUInt32LE(sectionOffset + 20);
  const rawSize = buf.readUInt32LE(sectionOffset + 16);
  if (exportRva >= virtAddr && exportRva < virtAddr + rawSize) {
    exportRaw = exportRva - virtAddr + rawAddr;
    break;
  }
  sectionOffset += 40;
}

if (exportRaw > 0) {
  const numNames = buf.readUInt32LE(exportRaw + 24);
  const namesRva = buf.readUInt32LE(exportRaw + 32);
  const namesRaw = namesRva - (exportRva - exportRaw);
  console.log(`Found ${numNames} exported functions:`);
  for (let i = 0; i < numNames; i++) {
    const nameRva = buf.readUInt32LE(namesRaw + i * 4);
    const nameRaw = nameRva - (exportRva - exportRaw);
    let name = '';
    let j = nameRaw;
    while (buf[j] !== 0) {
      name += String.fromCharCode(buf[j]);
      j++;
    }
    console.log(`  - ${name}`);
  }
} else {
  console.log('No export table or not found.');
}
