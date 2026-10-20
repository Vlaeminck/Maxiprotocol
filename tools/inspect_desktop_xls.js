const fs = require('fs');

const files = ['111.xls', '222.xls', '3333.xls'];
for (const f of files) {
  const full = `C:\\Users\\Gardenias\\Desktop\\${f}`;
  if (fs.existsSync(full)) {
    const stat = fs.statSync(full);
    console.log(`\n=== ${f} (${stat.size} bytes, modified ${stat.mtime.toLocaleTimeString()}) ===`);
    const buf = fs.readFileSync(full);
    // Check if HTML/XML or binary Excel or DBF
    const startStr = buf.slice(0, 500).toString('latin1');
    console.log('Start snippet:\n', startStr.slice(0, 300));
  }
}
