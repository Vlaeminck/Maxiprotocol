const fs = require('fs');

const buf = fs.readFileSync('C:\\MaxiREST_SQL\\generarmod7.exe');
console.log('Size:', buf.length);

// In Visual FoxPro EXEs, the FoxPro p-code or embedded resources are appended to the runtime or stub.
// Often there is a magic signature like 0x30 (DBF table header) or FoxPro signature at the end or in sections.
// Let's search for "mxmod" case-insensitive in chunks
let matches = [];
for (let i = 0; i < buf.length - 10; i++) {
  if (buf[i] === 0x6d || buf[i] === 0x4d) { // m or M
    const s = buf.slice(i, i + 5).toString('ascii').toLowerCase();
    if (s === 'mxmod') {
      matches.push(i);
    }
  }
}

console.log('Occurrences of "mxmod":', matches.length);
matches.slice(0, 10).forEach(idx => {
  console.log(`@ ${idx}: ${buf.slice(Math.max(0, idx - 40), Math.min(buf.length, idx + 80)).toString('latin1').replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')}`);
});
