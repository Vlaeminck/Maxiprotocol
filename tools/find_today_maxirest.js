const fs = require('fs');
const path = require('path');

const today = '2026-10-12';
const dir = 'C:\\MaxiRest';

try {
  const files = fs.readdirSync(dir);
  const modifiedToday = [];
  files.forEach(f => {
    try {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      const d = st.mtime.toISOString().slice(0, 10);
      if (d === today) {
        modifiedToday.push({ name: f, time: st.mtime.toISOString(), size: st.size });
      }
    } catch (e) {}
  });

  console.log(`Archivos modificados hoy (${today}) en C:\\MaxiRest: ${modifiedToday.length}`);
  modifiedToday.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 20).forEach(f => {
    console.log(`  ${f.time} | ${f.size} bytes | ${f.name}`);
  });
} catch (e) {
  console.error(e.message);
}
