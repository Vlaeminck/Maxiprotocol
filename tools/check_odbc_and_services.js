const { execSync } = require('child_process');

console.log('=== VERIFICANDO DSN ODBC Y SERVICIOS ===\n');

// 1. ODBC Data Sources en Registro
console.log('--- 1. Orígenes de datos ODBC (32-bit y 64-bit) ---');
try {
  const odbc32 = execSync('powershell -Command "Get-ItemProperty \'HKLM:\\SOFTWARE\\WOW6432Node\\ODBC\\ODBC.INI\\*\' | Select-Object PSChildName, Driver, Server, Port, Database, User | Format-List"', { encoding: 'utf8' });
  console.log('ODBC WOW6432Node:\n', odbc32);
} catch (e) {
  console.log('Error ODBC 32:', e.message);
}

try {
  const odbc64 = execSync('powershell -Command "Get-ItemProperty \'HKLM:\\SOFTWARE\\ODBC\\ODBC.INI\\*\' | Select-Object PSChildName, Driver, Server, Port, Database, User | Format-List"', { encoding: 'utf8' });
  console.log('ODBC 64:\n', odbc64);
} catch (e) {
  console.log('Error ODBC 64:', e.message);
}

try {
  const odbcUser = execSync('powershell -Command "Get-ItemProperty \'HKCU:\\SOFTWARE\\ODBC\\ODBC.INI\\*\' | Select-Object PSChildName, Driver, Server, Port, Database, User | Format-List"', { encoding: 'utf8' });
  console.log('ODBC CurrentUser:\n', odbcUser);
} catch (e) {
  console.log('Error ODBC User:', e.message);
}

// 2. Todos los servicios de Windows con MySQL o MariaDB o cualquier cosa en C:\Servidor_MariaDB
console.log('\n--- 2. Servicios de Windows apuntando a C:\\Servidor_MariaDB ---');
try {
  const allServices = execSync('powershell -Command "Get-WmiObject Win32_Service | Where-Object { $_.PathName -match \'Servidor_MariaDB\' -or $_.PathName -match \'mysqld\' -or $_.Name -match \'maria|mysql\' } | Select-Object Name, DisplayName, State, StartMode, PathName | Format-List"', { encoding: 'utf8' });
  console.log(allServices);
} catch (e) {
  console.log('Error buscando servicios WMI:', e.message);
}
