const fs = require('fs');
const path = require('path');

console.log('=== BÚSQUEDA SELECTIVA DE MAXIREST EN EL SISTEMA ===\n');

// 1. Revisar raíz C:\
console.log('1. Directorios en C:\\:');
try {
  fs.readdirSync('C:\\').forEach(item => {
    try {
      const full = path.join('C:\\', item);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        console.log(`  [DIR] ${item}`);
      }
    } catch (e) {}
  });
} catch (e) {}

// 2. Revisar C:\Program Files y C:\Program Files (x86) específicamente
console.log('\n2. Buscando "Maxi" y "Firebird" en Program Files:');
['C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData'].forEach(base => {
  if (fs.existsSync(base)) {
    try {
      fs.readdirSync(base).forEach(sub => {
        const full = path.join(base, sub);
        const low = sub.toLowerCase();
        if (low.includes('maxi') || low.includes('firebird') || low.includes('gastron') || low.includes('rest')) {
          console.log(`  Encontrado en ${base}: ${sub}`);
          try {
            const files = fs.readdirSync(full);
            console.log(`    Contenido (${files.length} items):`, files.slice(0, 10).join(', '));
          } catch (e) {}
        }
      });
    } catch (e) {}
  }
});

// 3. Revisar Descargas, Documentos y Escritorio del usuario
console.log('\n3. Buscando instaladores o archivos en la carpeta de usuario:');
const userBase = 'C:\\Users\\Gardenias';
['Downloads', 'Documents', 'Desktop'].forEach(folder => {
  const p = path.join(userBase, folder);
  if (fs.existsSync(p)) {
    try {
      fs.readdirSync(p).forEach(item => {
        const low = item.toLowerCase();
        if (low.includes('maxi') || low.includes('rest') || low.includes('firebird') || low.endsWith('.fdb') || low.endsWith('.gdb')) {
          console.log(`  En ${folder}: ${item}`);
        }
      });
    } catch (e) {}
  }
});

// 4. Ver si hay otros discos en Windows
console.log('\n4. Discos disponibles:');
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
  const drive = `${letter}:\\`;
  try {
    if (fs.existsSync(drive)) {
      console.log(`  Disco disponible: ${drive}`);
      if (letter !== 'C') {
        try {
          const roots = fs.readdirSync(drive);
          console.log(`    Contenido raíz:`, roots.slice(0, 10).join(', '));
        } catch (e) {}
      }
    }
  } catch (e) {}
});
