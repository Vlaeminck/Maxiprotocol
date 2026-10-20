const fs = require('fs');
const path = require('path');

const dirs = ['C:\\MaxiRest', 'C:\\MaxiREST_SQL'];
const today = new Date('2026-10-15T00:00:00Z');

const files = [];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.mtime >= today) {
        files.push({ full, size: stat.size, mtime: stat.mtime });
      }
    } catch(e) {}
  }
}

files.sort((a, b) => b.mtime - a.mtime);
console.log(`Files modified today (${files.length}):`);
for (const f of files.slice(0, 35)) {
  console.log(`${f.mtime.toLocaleTimeString()} - ${path.basename(f.full)} (${f.size} bytes)`);
}
