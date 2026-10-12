const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const idsInJs = Array.from(js.matchAll(/document\.getElementById\('([^']+)'\)/g)).map(m => m[1]);
const missingIds = idsInJs.filter(id => !html.includes('id="' + id + '"') && !html.includes("id='" + id + "'"));
console.log('Missing IDs in index.html:', Array.from(new Set(missingIds)));
