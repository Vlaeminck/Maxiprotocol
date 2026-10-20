const { execSync } = require('child_process');

try {
  console.log('--- 32-bit System DSNs ---');
  console.log(execSync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\ODBC\\ODBC.INI" /s', { stdio: 'pipe' }).toString());
} catch(e) {
  console.log('Error 32-bit:', e.message);
}

try {
  console.log('--- Current User DSNs ---');
  console.log(execSync('reg query "HKCU\\SOFTWARE\\ODBC\\ODBC.INI" /s', { stdio: 'pipe' }).toString());
} catch(e) {
  console.log('Error User:', e.message);
}
