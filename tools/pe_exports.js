const fs = require('fs');

function getDllExports(dllPath) {
  try {
    const buf = fs.readFileSync(dllPath);
    // PE Header offset en 0x3C
    const peOffset = buf.readUInt32LE(0x3C);
    const magic = buf.readUInt16LE(peOffset);
    if (magic !== 0x4550) return { error: 'Not PE' };

    // Export Directory RVA en DataDirectory[0] (offset peOffset + 0x78)
    const exportRva = buf.readUInt32LE(peOffset + 0x78);
    const exportSize = buf.readUInt32LE(peOffset + 0x7C);
    if (exportRva === 0) return { exports: [] };

    // Mapear RVA a FileOffset usando secciones
    const numSections = buf.readUInt16LE(peOffset + 0x06);
    const optHeaderSize = buf.readUInt16LE(peOffset + 0x14);
    const secHeaderOffset = peOffset + 0x18 + optHeaderSize;

    function rvaToOffset(rva) {
      for (let i = 0; i < numSections; i++) {
        const secOffset = secHeaderOffset + (i * 40);
        const secRva = buf.readUInt32LE(secOffset + 12);
        const secRawSize = buf.readUInt32LE(secOffset + 16);
        const secRawOffset = buf.readUInt32LE(secOffset + 20);
        if (rva >= secRva && rva < secRva + secRawSize) {
          return secRawOffset + (rva - secRva);
        }
      }
      return null;
    }

    const exportDirOffset = rvaToOffset(exportRva);
    if (!exportDirOffset) return { error: 'Cannot map export dir' };

    const numNames = buf.readUInt32LE(exportDirOffset + 24);
    const namesRva = buf.readUInt32LE(exportDirOffset + 32);
    const namesOffset = rvaToOffset(namesRva);

    const names = [];
    for (let i = 0; i < numNames; i++) {
      const nameRva = buf.readUInt32LE(namesOffset + (i * 4));
      const nameOffset = rvaToOffset(nameRva);
      let name = '';
      let ptr = nameOffset;
      while (buf[ptr] !== 0) {
        name += String.fromCharCode(buf[ptr]);
        ptr++;
      }
      names.push(name);
    }
    return { exports: names };
  } catch (e) {
    return { error: e.message };
  }
}

console.log('Exports CLAVE.DLL:', getDllExports('C:\\MaxiREST_SQL\\CLAVE.DLL'));
console.log('Exports CLAVER1.DLL:', getDllExports('C:\\MaxiREST_SQL\\CLAVER1.DLL'));
console.log('Exports DISKSERIAL.DLL:', getDllExports('C:\\MaxiREST_SQL\\DISKSERIAL.DLL'));
