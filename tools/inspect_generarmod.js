const fs = require('fs');

const p = 'C:\\MaxiREST_SQL\\generarmod7.exe';
const buf = fs.readFileSync(p);
const str = buf.toString('latin1');

console.log('generarmod7.exe size:', buf.length);

const terms = ['mxmod', 'USUARIO', 'CLAVE', 'PARAMETROS', 'AES', 'DES', 'Encrypt', 'Decrypt', 'M9NDg7', 'RC4', 'Chilkat', 'Blowfish'];

terms.forEach(term => {
  let pos = 0;
  let count = 0;
  while ((pos = str.indexOf(term, pos)) !== -1 && count < 5) {
    const s = str.slice(Math.max(0, pos - 50), Math.min(str.length, pos + 100)).replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
    console.log(`[${term}] @ ${pos}: ${s.trim()}`);
    pos += term.length + 10;
    count++;
  }
});
