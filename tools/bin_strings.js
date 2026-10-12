const fs = require('fs');

function searchStringsInBin(filePath, keywords) {
  try {
    const buf = fs.readFileSync(filePath);
    console.log(`\nBuscando en ${filePath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)...`);
    
    // Buscar secuencias ASCII de longitud >= 4
    let currentStr = '';
    const found = [];
    for (let i = 0; i < buf.length; i++) {
      const byte = buf[i];
      if (byte >= 32 && byte <= 126) {
        currentStr += String.fromCharCode(byte);
      } else {
        if (currentStr.length >= 6) {
          const low = currentStr.toLowerCase();
          for (const kw of keywords) {
            if (low.includes(kw)) {
              found.push(currentStr);
              break;
            }
          }
        }
        currentStr = '';
      }
    }
    console.log(`Encontradas ${found.length} coincidencias.`);
    // Mostrar únicas
    const uniq = Array.from(new Set(found));
    uniq.slice(0, 30).forEach(s => console.log('  *', s));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

searchStringsInBin('C:\\MaxiADMIN\\ACTSQLMA.EXE', ['pwd=', 'password=', 'uid=', 'user=', '3399', 'mysql', 'mariadb', 'driver=']);
