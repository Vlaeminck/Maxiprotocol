const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiREST_SQL/CLAVER1.DLL');

const peOffset = buf.readUInt32LE(0x3C);
const numSections = buf.readUInt16LE(peOffset + 6);
const optHeaderSize = buf.readUInt16LE(peOffset + 20);
const optHeader = peOffset + 24;

const exportRva = buf.readUInt32LE(optHeader + 96);
const exportSize = buf.readUInt32LE(optHeader + 100);

console.log('Export RVA:', exportRva.toString(16), 'Size:', exportSize);

// Section headers start after optional header
const sectionHeadersOffset = optHeader + optHeaderSize;
let exportFileOffset = 0;

for (let i = 0; i < numSections; i++) {
  const sOffset = sectionHeadersOffset + i * 40;
  const sName = buf.slice(sOffset, sOffset + 8).toString('ascii').replace(/\0/g, '');
  const sVirtualSize = buf.readUInt32LE(sOffset + 8);
  const sVirtualAddress = buf.readUInt32LE(sOffset + 12);
  const sRawSize = buf.readUInt32LE(sOffset + 16);
  const sRawPointer = buf.readUInt32LE(sOffset + 20);
  
  if (exportRva >= sVirtualAddress && exportRva < sVirtualAddress + sVirtualSize) {
    exportFileOffset = sRawPointer + (exportRva - sVirtualAddress);
    console.log(`Found export table in section ${sName} at file offset 0x${exportFileOffset.toString(16)}`);
    break;
  }
}

if (exportFileOffset > 0) {
  const numNames = buf.readUInt32LE(exportFileOffset + 24);
  const addressesRva = buf.readUInt32LE(exportFileOffset + 28);
  const namesRva = buf.readUInt32LE(exportFileOffset + 32);
  const ordinalsRva = buf.readUInt32LE(exportFileOffset + 36);

  // Helper to convert RVA to file offset
  function rvaToOffset(rva) {
    for (let i = 0; i < numSections; i++) {
      const sOffset = sectionHeadersOffset + i * 40;
      const sVirtualSize = buf.readUInt32LE(sOffset + 8);
      const sVirtualAddress = buf.readUInt32LE(sOffset + 12);
      const sRawPointer = buf.readUInt32LE(sOffset + 20);
      if (rva >= sVirtualAddress && rva < sVirtualAddress + sVirtualSize) {
        return sRawPointer + (rva - sVirtualAddress);
      }
    }
    return 0;
  }

  const namesOffset = rvaToOffset(namesRva);
  console.log(`Number of exported names: ${numNames}`);

  for (let i = 0; i < numNames; i++) {
    const nameRva = buf.readUInt32LE(namesOffset + i * 4);
    const nameOffset = rvaToOffset(nameRva);
    let name = '';
    let j = nameOffset;
    while (buf[j] !== 0) {
      name += String.fromCharCode(buf[j]);
      j++;
    }
    console.log(`Export [${i}]: ${name}`);
  }
}
