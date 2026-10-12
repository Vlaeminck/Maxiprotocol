const fs = require('fs');
const path = require('path');

const dirs = ['C:\\Servidor_MariaDB', 'C:\\Servidor_MariaDB\\bin', 'C:\\MaxiREST_SQL', 'C:\\MaxiBack', 'C:\\MaxiADMIN'];

dirs.forEach(d => {
  if (fs.existsSync(d)) {
    try {
      const files = fs.readdirSync(d);
      const scripts = files.filter(f => ['.bat', '.cmd', '.vbs', '.ps1'].includes(path.extname(f).toLowerCase()));
      if (scripts.length > 0) {
        console.log(`Scripts en ${d}:`, scripts);
        scripts.forEach(s => {
          const content = fs.readFileSync(path.join(d, s), 'latin1');
          console.log(`\n--- ${path.join(d, s)} ---`);
          console.log(content);
        });
      }
    } catch (e) {}
  }
});
