const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiREST_SQL/CLAVER1.DLL');
const str = buf.toString('latin1');
const matches = str.match(/[a-zA-Z0-9_]{3,30}\.[a-zA-Z0-9_]{3,30}/g);
if (matches) {
  const filtered = matches.filter(m => !m.endsWith('.dll') && !m.endsWith('.exe') && !m.endsWith('.vfp'));
  console.log('ProgID candidates:', [...new Set(filtered)].slice(0, 20));
}
