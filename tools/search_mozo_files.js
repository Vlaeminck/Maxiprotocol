const { execSync } = require('child_process');
const fs = require('fs');

console.log('Searching for any files with "mozo" or "venta" in name on C:\\...');
try {
  const res = execSync('powershell -Command "Get-ChildItem -Path C:\\ -Filter *mozo* -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime | Select-Object -First 50 | Format-Table -AutoSize"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(res);
} catch(e) {
  console.log('Error:', e.message);
}
