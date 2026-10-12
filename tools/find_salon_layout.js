const fs = require('fs');
const path = require('path');

const dirs = ['C:\\MaxiREST_SQL', 'C:\\MaxiRest'];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d);
  files.forEach(f => {
    try {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.size < 5000000) {
        const buf = fs.readFileSync(p);
        if (buf.includes('VEREDA') || buf.includes('TERRAZA')) {
          console.log(`[PLANO DETECTADO EN]: ${p} (${st.size} bytes)`);
        }
      }
    } catch (e) {}
  });
});
