const { execSync } = require('child_process');

console.log('=== INSPECCIONANDO PROCESO 4260 (MAXIREST.EXE) ===\n');

try {
  const cmd = `powershell -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = 4260' | Select-Object ProcessId, Name, ExecutablePath, CommandLine | Format-List"`;
  console.log(execSync(cmd, { encoding: 'utf8' }));
} catch (e) {
  console.log(e.message);
}
