const { execSync } = require('child_process');

try {
  const out = execSync('powershell -Command "Get-Process MAXIREST | Select-Object -ExpandProperty Modules | Select-Object -ExpandProperty FileName"', { stdio: 'pipe' }).toString();
  const lines = out.split('\r\n').filter(Boolean);
  const mysqlLines = lines.filter(l => /mysql|maria|odbc|sql|data|net/i.test(l));
  console.log('SQL/Data modules in MAXIREST:');
  console.log(mysqlLines);
} catch(e) {
  console.log('Err:', e.message);
}
