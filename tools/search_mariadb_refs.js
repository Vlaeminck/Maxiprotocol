const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiREST_SQL';
const files = fs.readdirSync(dir);

console.log(`Buscando referencias en ${files.length} archivos de ${dir}...`);

files.forEach(f => {
  const ext = path.extname(f).toLowerCase();
  // Buscar en archivos de texto, config, prg, vcx, ini, dll, cfg, dbf
  if (['.ini', '.cfg', '.conf', '.txt', '.xml', '.json', '.prg', '.h', '.inc', '.bat'].includes(ext)) {
    try {
      const p = path.join(dir, f);
      const content = fs.readFileSync(p, 'latin1');
      if (content.includes('3399') || content.toLowerCase().includes('uid=') || content.toLowerCase().includes('pwd=') || content.toLowerCase().includes('database=')) {
        console.log(`[MATCH en ${f}]:`, content.slice(0, 300));
      }
    } catch (e) {}
  }
});

// También chequear si hay archivos en C:\MaxiRESTSQL--
const dir2 = 'C:\\MaxiRESTSQL--';
if (fs.existsSync(dir2)) {
  fs.readdirSync(dir2).forEach(f => {
    const ext = path.extname(f).toLowerCase();
    if (['.ini', '.cfg', '.conf', '.txt', '.xml', '.json', '.prg', '.h', '.inc', '.bat'].includes(ext)) {
      try {
        const p = path.join(dir2, f);
        const content = fs.readFileSync(p, 'latin1');
        if (content.includes('3399') || content.toLowerCase().includes('uid=') || content.toLowerCase().includes('pwd=') || content.toLowerCase().includes('database=')) {
          console.log(`[MATCH en ${dir2}\\${f}]:`, content.slice(0, 300));
        }
      } catch (e) {}
    }
  });
}
