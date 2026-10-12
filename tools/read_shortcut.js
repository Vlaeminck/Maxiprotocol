const fs = require('fs');

const buf = fs.readFileSync('C:\\Users\\Gardenias\\Desktop\\MaxiREST 10783.lnk');
console.log('Shortcut length:', buf.length);
// Extract printable strings
const text = buf.toString('latin1');
const matches = text.match(/[\w\:\\\-\.\_]{4,}/g);
console.log('Strings in shortcut:', [...new Set(matches)]);
