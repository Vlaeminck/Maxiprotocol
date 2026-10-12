const fs = require('fs');
const path = require('path');

const exes = [
  'C:\\MaxiREST_SQL\\MAXIREST.EXE',
  'C:\\MaxiREST_SQL\\generarmod7.exe',
  'C:\\MaxiREST_SQL\\migrador7.exe',
  'C:\\MaxiREST_SQL\\RECUPERARBD.EXE',
  'C:\\MaxiREST_SQL\\RESGUARDARDB.EXE',
  'C:\\MaxiREST_SQL\\MAXISHELL.EXE',
  'C:\\MaxiREST_SQL\\MAXILINK.EXE'
];

exes.forEach(exe => {
  if (!fs.existsSync(exe)) return;
  console.log(`\nScanning ${path.basename(exe)}...`);
  const buf = fs.readFileSync(exe);
  const latin = buf.toString('latin1');
  
  // Search for "contrase" or "personalizada" or "v7.1"
  ['contrase', 'personalizada', 'v7.1', '3399', 'mx_'].forEach(term => {
    let pos = 0;
    while ((pos = latin.indexOf(term, pos)) !== -1) {
      const snippet = latin.slice(Math.max(0, pos - 40), Math.min(latin.length, pos + 80)).replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
      console.log(`  [${term}] @ ${pos}: ${snippet.trim()}`);
      pos += term.length + 20;
    }
  });
});
