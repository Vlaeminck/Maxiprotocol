const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== BUSCANDO ACCESOS DIRECTOS Y EJECUTABLES DE MAXIREST ===\n');

// 1. Acceso directos en Escritorio y Menú Inicio
const shortcutDirs = [
  'C:\\Users\\Gardenias\\Desktop',
  'C:\\Users\\Public\\Desktop',
  'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
  'C:\\Users\\Gardenias\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs'
];

shortcutDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      const items = fs.readdirSync(dir, { recursive: true });
      items.forEach(it => {
        if (typeof it === 'string' && it.toLowerCase().includes('maxi')) {
          console.log(`[Acceso Directo / Elemento]: ${path.join(dir, it)}`);
        }
      });
    } catch (e) {}
  }
});

// 2. Registro de Windows buscando Maxirest o Maxi Sistemas
console.log('\n--- Buscando en el Registro de Windows ---');
const regKeys = [
  'HKLM\\Software\\Maxi Sistemas',
  'HKLM\\Software\\WOW6432Node\\Maxi Sistemas',
  'HKCU\\Software\\Maxi Sistemas',
  'HKLM\\Software\\Firebird Project',
  'HKLM\\Software\\WOW6432Node\\Firebird Project'
];

regKeys.forEach(k => {
  try {
    const out = execSync(`reg query "${k}" /s`, { encoding: 'utf8' });
    console.log(`Registro [${k}]:\n${out}\n`);
  } catch (e) {
    // console.log(`No encontrado: ${k}`);
  }
});

// 3. Buscar ejecutables en Program Files y Program Files (x86)
console.log('\n--- Buscando carpetas Maxi en Program Files ---');
['C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\', 'C:\\Users\\Gardenias\\AppData\\Local', 'C:\\Users\\Gardenias\\AppData\\Roaming'].forEach(root => {
  try {
    const items = fs.readdirSync(root);
    items.forEach(it => {
      if (it.toLowerCase().includes('maxi')) {
        console.log(`Carpeta encontrada: ${path.join(root, it)}`);
      }
    });
  } catch (e) {}
});

// 4. Buscar procesos o desinstaladores en Registro de Windows (Uninstall)
console.log('\n--- Buscando en Desinstaladores de Windows ---');
try {
  const out = execSync('powershell -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName -match \'Maxi\' -or $_.DisplayName -match \'Firebird\' } | Select-Object DisplayName, InstallLocation, DisplayVersion, Publisher | Format-List"', { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log('Error buscando desinstaladores:', e.message);
}
