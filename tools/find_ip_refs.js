const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== BUSCANDO "192.168.1.3" EN ARCHIVOS Y REGISTRO ===\n');

// 1. Buscar en registro
console.log('1. Buscando en Registro...');
try {
  const regFind = execSync('powershell -Command "Get-ChildItem -Path HKCU:\\, HKLM:\\Software -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $k = $_; $k.GetValueNames() | ForEach-Object { $val = $k.GetValue($_); if ($val -match \'192.168.1.3\' -or $val -match \'mx_10783\') { \"$($k.Name) -> $_ = $val\" } } }"', { encoding: 'utf8' });
  console.log(regFind);
} catch (e) {
  console.log('Error registro:', e.message);
}

// 2. Buscar en C:\MaxiREST_SQL
console.log('\n2. Buscando en archivos de C:\\MaxiREST_SQL...');
try {
  const files = fs.readdirSync('C:\\MaxiREST_SQL');
  files.forEach(f => {
    try {
      const p = path.join('C:\\MaxiREST_SQL', f);
      const st = fs.statSync(p);
      if (st.size < 5000000) {
        const buf = fs.readFileSync(p);
        if (buf.includes('192.168.1.3') || buf.includes('mx_10783')) {
          console.log(`[MATCH EN ARCHIVO]: ${f}`);
          // Mostrar contexto
          const str = buf.toString('latin1');
          const idx = Math.max(str.indexOf('192.168.1.3'), str.indexOf('mx_10783'));
          console.log(str.slice(Math.max(0, idx - 100), Math.min(str.length, idx + 200)));
        }
      }
    } catch (e) {}
  });
} catch (e) {}

// 3. Buscar en C:\MaxiRest
console.log('\n3. Buscando en C:\\MaxiRest...');
try {
  const files = fs.readdirSync('C:\\MaxiRest');
  files.forEach(f => {
    try {
      const p = path.join('C:\\MaxiRest', f);
      const st = fs.statSync(p);
      if (st.size < 5000000) {
        const buf = fs.readFileSync(p);
        if (buf.includes('192.168.1.3') || buf.includes('mx_10783')) {
          console.log(`[MATCH EN C:\\MaxiRest]: ${f}`);
        }
      }
    } catch (e) {}
  });
} catch (e) {}
