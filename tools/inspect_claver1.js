const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiREST_SQL/CLAVER1.DLL');
// Simple PE export reader
const peOffset = buf.readUInt32LE(0x3C);
const optHeaderOffset = peOffset + 4 + 20;
const exportTableRva = buf.readUInt32LE(optHeaderOffset + 96);
const exportTableSize = buf.readUInt32LE(optHeaderOffset + 100);

console.log('Export Table RVA:', exportTableRva.toString(16), 'Size:', exportTableSize);

// Let's search strings in CLAVER1.DLL
const str = buf.toString('latin1');
const funcMatches = str.match(/[a-zA-Z0-9_]{3,30}/g);
const interesting = funcMatches.filter(f => /encr|decr|clave|pass|code|hash|crypt/i.test(f));
console.log('Interesting names in CLAVER1.DLL:', [...new Set(interesting)]);
