const fs = require('fs');
const path = require('path');

console.log('=== BUSCANDO CREDENCIALES DE BASE DE DATOS ===\n');

const dirs = ['C:\\MaxiREST_SQL', 'C:\\MaxiADMIN', 'C:\\MaxiBack', 'C:\\Servidor_MariaDB'];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  try {
    const files = fs.readdirSync(d);
    files.forEach(f => {
      const ext = path.extname(f).toLowerCase();
      if (['.ini', '.cfg', '.conf', '.txt', '.bat', '.cmd', '.xml', '.json', '.sql', '.php'].includes(ext)) {
        try {
          const content = fs.readFileSync(path.join(d, f), 'latin1');
          ['pwd', 'password', 'clave', 'usuario', 'user', 'root', 'uid', 'dsn', 'server', '3399', '3306', 'mx_'].forEach(kw => {
            const idx = content.toLowerCase().indexOf(kw);
            if (idx !== -1) {
              const snippet = content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 100));
              console.log(`[${f}] (${kw}): ${snippet.replace(/\r?\n/g, ' ')}`);
            }
          });
        } catch (e) {}
      }
    });
  } catch (e) {}
});
