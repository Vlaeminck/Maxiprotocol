const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiRest';
const files = fs.readdirSync(dir);
console.log(`Total archivos en ${dir}: ${files.length}`);

const extensions = {};
const subdirs = [];
const executables = [];
const configFiles = [];

files.forEach(f => {
  try {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      subdirs.push(f);
    } else {
      const ext = path.extname(f).toLowerCase();
      extensions[ext] = (extensions[ext] || 0) + 1;
      if (['.exe', '.dll', '.bat', '.cmd'].includes(ext)) {
        executables.push({ name: f, size: st.size });
      }
      if (['.ini', '.cfg', '.conf', '.json', '.xml', '.txt'].includes(ext)) {
        configFiles.push({ name: f, size: st.size });
      }
    }
  } catch (e) {}
});

console.log('\nSubdirectorios:', subdirs);
console.log('\nExtensiones de archivos:', extensions);
console.log('\nEjecutables encontrados:', executables);
console.log('\nArchivos de configuración / texto:', configFiles);
