const fs = require('fs');
const path = require('path');

const dir = 'C:\\MaxiREST_SQL';
const items = fs.readdirSync(dir);
const exts = {};
items.forEach(it => {
  const ext = path.extname(it).toLowerCase() || '[none]';
  exts[ext] = (exts[ext] || 0) + 1;
});
console.log('Extensiones en C:\\MaxiREST_SQL:', exts);

// Mostrar archivos que no sean .frt o .frx
const otros = items.filter(it => {
  const ext = path.extname(it).toLowerCase();
  return ext !== '.frt' && ext !== '.frx';
});
console.log(`\nArchivos distintos de .frt/.frx (${otros.length}):`, otros);
