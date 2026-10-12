const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir);

console.log(`Buscando archivos modificados en octubre 2026 en ${dir}...`);

const octFiles = [];

files.forEach(f => {
  try {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    const mtime = st.mtime;
    // Octubre 2026: mes 9 (0-indexed) y año 2026
    if (mtime.getFullYear() === 2026 && mtime.getMonth() >= 8) { // Septiembre u Octubre 2026
      octFiles.push({ file: f, path: p, size: st.size, mtime });
    }
  } catch (e) {}
});

octFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

console.log(`Encontrados ${octFiles.length} archivos de Sep/Oct 2026:`);
octFiles.slice(0, 30).forEach(o => {
  console.log(`  - ${o.file} (${o.size} bytes) | ${o.mtime.toLocaleString()}`);
});
