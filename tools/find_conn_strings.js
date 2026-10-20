const fs = require('fs');

const files = ['C:/MaxiREST_SQL/MAXIREST.EXE', 'C:/MaxiREST_SQL/ACTSQLMA.EXE', 'C:/MaxiREST_SQL/RECUPERARBD.EXE', 'C:/MaxiREST_SQL/migrador7.exe'];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  const str = buf.toString('latin1');
  const matches = str.match(/(?:DRIVER|SERVER|DATABASE|UID|PWD|PORT)=[^;\r\n]{2,40}/gi);
  if (matches) {
    console.log(`Matches in ${f}:`, [...new Set(matches)]);
  }
}
