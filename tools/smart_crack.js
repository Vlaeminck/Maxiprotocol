const crypto = require('crypto');
const fs = require('fs');

const targetHash = '*C1B7F8B962A21262AAF6F154E6FA0A31F1EDB121'.toUpperCase();

function mysqlHash(pwd) {
  const h1 = crypto.createHash('sha1').update(pwd).digest();
  const h2 = crypto.createHash('sha1').update(h1).digest('hex').toUpperCase();
  return '*' + h2;
}

// Generate intelligent candidates
const bases = [
  'maxi', 'Maxi', 'MAXI',
  'maxirest', 'Maxirest', 'MaxiRest', 'MAXIREST',
  'mrest', 'Mrest', 'MREST',
  'mxt', 'Mxt', 'MXT',
  'gastro', 'Gastro', 'GASTRO',
  'market', 'Market',
  'admin', 'Admin', 'ADMIN',
  'root', 'Root', 'ROOT',
  'server', 'Server', 'SERVER',
  'servidor', 'Servidor',
  'soporte', 'Soporte',
  'sistema', 'sistemas',
  'clave', 'Clave',
  'pos', 'POS',
  'mariadb', 'MariaDB', 'MariaDb',
  'mysql', 'MySQL',
  'rental', 'Rental', 'prorental', 'rental7', 'rental71', 'rental73',
  'sql', 'SQL',
  'conexion', 'Conexion',
  'cliente', 'Cliente',
  'caja', 'Caja',
  'terminal', 'Terminal',
  'mozo', 'Mozo',
  'turno', 'Turno'
];

const suffixes = [
  '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  '12', '123', '1234', '12345', '123456', '12345678', '00', '000', '0000',
  '!', '@', '#', '$', '%', '*',
  '7', '7.1', '71', '7.3', '73',
  '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  '_7', '_71', '_7.1', '_73', '_7.3',
  'sql', 'SQL', 'db', 'DB',
  '10783', '27366'
];

const seps = ['', '_', '.', '-'];

let checked = 0;
let found = null;

const t0 = Date.now();

for (const b of bases) {
  for (const s of suffixes) {
    for (const sep of seps) {
      const candidates = [
        `${b}${sep}${s}`,
        `${s}${sep}${b}`,
        `${b}${s}`,
        `${s}${b}`
      ];
      for (const cand of candidates) {
        checked++;
        if (mysqlHash(cand) === targetHash) {
          found = cand;
          break;
        }
      }
      if (found) break;
    }
    if (found) break;
  }
  if (found) break;
}

if (found) {
  console.log(`\n🎉 ENCONTRADA EN DICCIONARIO!`);
  console.log(`Password: "${found}"`);
  console.log(`Checked: ${checked} in ${Date.now() - t0}ms`);
} else {
  console.log(`Probadas ${checked} combinaciones, no encontrada aún.`);
}
