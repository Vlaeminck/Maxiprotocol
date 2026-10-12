const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== DETALLES DE LA BASE DE DATOS MAXIREST EN MARIADB ===\n');

// 1. Tablas en mx_27366
const mxDir = 'C:\\Servidor_MariaDB\\mx_27366';
if (fs.existsSync(mxDir)) {
  const tables = fs.readdirSync(mxDir);
  console.log(`Tablas en mx_27366: (${tables.length} archivos)`);
  // Agrupar por nombre de tabla (.frm o .ibd)
  const tableNames = new Set(tables.map(t => t.replace(/\.(frm|ibd)$/i, '')));
  console.log(`Total tablas lógicas: ${tableNames.size}`);
  console.log('Muestra de tablas:', Array.from(tableNames).slice(0, 40).join(', '));
}

// 2. Revisar las últimas líneas del archivo de log .err
const errLog = 'C:\\Servidor_MariaDB\\DESKTOP-VQ6TGN0.err';
if (fs.existsSync(errLog)) {
  console.log('\n--- Últimas 30 líneas de DESKTOP-VQ6TGN0.err ---');
  const lines = fs.readFileSync(errLog, 'latin1').split('\n');
  console.log(lines.slice(-30).join('\n'));
}

// 3. Revisar si hay bin/mysqld.exe
const mysqld = 'C:\\Servidor_MariaDB\\bin\\mysqld.exe';
console.log('\n--- Verificando binarios ---');
console.log('mysqld.exe existe:', fs.existsSync(mysqld));

// 4. Ver servicios de Windows instalados (todos los nombres)
console.log('\n--- Buscando en el registro el servicio MariaDB ---');
try {
  const regServices = execSync('powershell -Command "Get-ItemProperty HKLM:\\SYSTEM\\CurrentControlSet\\Services\\* | Where-Object { $_.ImagePath -match \'MariaDB\' -or $_.ImagePath -match \'3399\' } | Select-Object PSChildName, DisplayName, ImagePath | Format-List"', { encoding: 'utf8' });
  console.log(regServices);
} catch (e) {
  console.log('Error buscando servicio en registro:', e.message);
}
