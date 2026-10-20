const { execSync } = require('child_process');

try {
  const out = execSync('powershell -Command "Get-Process MAXIREST | Select-Object Id, ProcessName, MainWindowTitle | Format-List"', { stdio: 'pipe' }).toString();
  console.log(out);
} catch(e) {
  console.log('Error:', e.message);
}
