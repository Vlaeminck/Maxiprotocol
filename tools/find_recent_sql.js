const fs = require('fs');
const path = require('path');

function findRecentFiles(dir, maxDepth = 4) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const results = [];

  function walk(current, depth) {
    if (depth > maxDepth) return;
    try {
      const items = fs.readdirSync(current);
      for (const item of items) {
        const full = path.join(current, item);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (item !== 'JRERUNTIME' && item !== 'AYUDA') {
              walk(full, depth + 1);
            }
          } else {
            if (stat.mtimeMs >= sevenDaysAgo) {
              results.push({
                path: full,
                mtime: stat.mtime.toISOString(),
                size: stat.size
              });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  walk(dir, 0);
  return results.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

console.log('Archivos modificados en los últimos 7 días en C:\\MaxiREST_SQL:');
const recent = findRecentFiles('C:\\MaxiREST_SQL');
recent.forEach(r => {
  console.log(`- ${r.mtime} | ${r.size.toString().padStart(9)} bytes | ${r.path}`);
});
