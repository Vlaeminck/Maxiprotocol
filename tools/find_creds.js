const fs = require('fs');
const path = require('path');

const dir = 'C:/MaxiREST_SQL';
const files = fs.readdirSync(dir);

for (const f of files) {
  try {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.size > 15 * 1024 * 1024) continue;
    const buf = fs.readFileSync(fp);
    const str = buf.toString('latin1');
    const m = str.match(/(?:user_|mx_|usuario|password|pwd|pass)[a-zA-Z0-9_]{3,30}/gi);
    if (m && m.length > 0) {
      const unique = [...new Set(m)].filter(x => !x.startsWith('password') && !x.startsWith('Password'));
      if (unique.length > 0) {
        console.log(`File: ${f} ->`, unique.slice(0, 5));
      }
    }
  } catch(e){}
}
