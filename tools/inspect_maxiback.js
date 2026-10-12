const fs = require('fs');
const path = require('path');

console.log('=== INSPECCIONANDO C:\\MaxiBack ===\n');

['C:\\MaxiBack\\PG7.2.22', 'C:\\MaxiBack\\Librerias completas'].forEach(d => {
  if (fs.existsSync(d)) {
    console.log(`Directorio: ${d}`);
    try {
      const items = fs.readdirSync(d);
      console.log(`  Items (${items.length}):`, items.slice(0, 30).join(', '));
      // Buscar archivos .sql, .bat, .ini, .txt, .cfg
      items.forEach(it => {
        const ext = path.extname(it).toLowerCase();
        if (['.sql', '.bat', '.ini', '.txt', '.cfg', '.conf'].includes(ext)) {
          const p = path.join(d, it);
          const st = fs.statSync(p);
          console.log(`  -> Archivo ${it} (${st.size} bytes):`);
          if (st.size < 5000) {
            console.log(fs.readFileSync(p, 'latin1'));
          }
        }
      });
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
});
