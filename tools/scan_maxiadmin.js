const fs = require('fs');
const path = require('path');

console.log('=== INSPECCIONANDO C:\\MaxiADMIN ===\n');

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach(it => {
    const full = path.join(dir, it);
    try {
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        console.log(`[DIR] ${full}`);
        scanDir(full);
      } else {
        const ext = path.extname(it).toLowerCase();
        if (['.json', '.ini', '.cfg', '.conf', '.txt', '.yaml', '.yml', '.env'].includes(ext)) {
          console.log(`[CFG] ${full} (${st.size} bytes)`);
          if (st.size < 5000) {
            console.log(fs.readFileSync(full, 'latin1'));
          }
        }
      }
    } catch (e) {}
  });
}

scanDir('C:\\MaxiADMIN');
