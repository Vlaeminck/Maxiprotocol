const fs = require('fs');

const files = [
  'C:\\MaxiADMIN\\instaladoract.exe',
  'C:\\MaxiADMIN\\ACTSQLMA.EXE',
  'C:\\MaxiADMIN\\actinstalv6.exe',
  'C:\\MaxiREST_SQL\\instaladoract.exe'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  console.log(`Checking ${f}...`);
  try {
    const buf = fs.readFileSync(f);
    const latin = buf.toString('latin1');
    const idx = latin.indexOf('C1B7F8B9');
    if (idx !== -1) {
      console.log(`FOUND HASH in ${f} at ${idx}!`);
      console.log(latin.slice(Math.max(0, idx - 100), Math.min(latin.length, idx + 200)));
    }
  } catch (e) {
    console.error(e.message);
  }
});
