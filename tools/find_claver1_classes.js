const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiREST_SQL/CLAVER1.DLL');
const str = buf.toString('latin1');
// Search for DEFINE CLASS or class names
const matches = str.match(/claver1[a-zA-Z0-9_]*/gi);
console.log('Matches for claver1:', [...new Set(matches)]);
