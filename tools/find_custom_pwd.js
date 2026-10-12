const fs = require('fs');
const path = require('path');

console.log('=== BUSCANDO "Utiliza contraseña personalizada" ===\n');

const dirs = ['C:\\MaxiREST_SQL', 'C:\\MaxiADMIN', 'C:\\MaxiBack'];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d);
  files.forEach(f => {
    try {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.size < 20000000) {
        const buf = fs.readFileSync(p);
        const str = buf.toString('latin1');
        if (str.includes('contrase') && (str.includes('personalizada') || str.includes('Conexi') || str.includes('3399'))) {
          console.log(`[MATCH EN]: ${p}`);
          // Buscar qué código o strings están cerca
          const idx = str.indexOf('personalizada');
          if (idx !== -1) {
            console.log('Contexto:', str.slice(Math.max(0, idx - 150), Math.min(str.length, idx + 250)));
          }
        }
      }
    } catch (e) {}
  });
});
