const crypto = require('crypto');

const targetHash = '*C1B7F8B962A21262AAF6F154E6FA0A31F1EDB121'.toUpperCase();

function mysqlHash(pwd) {
  const h1 = crypto.createHash('sha1').update(pwd).digest();
  const h2 = crypto.createHash('sha1').update(h1).digest('hex').toUpperCase();
  return '*' + h2;
}

const wordlist = [
  '', 'root', 'maxirest', 'Maxirest', 'MAXIREST', 'admin', 'Admin', 'ADMIN',
  '1234', '123456', '12345678', 'password', 'Password', '10783', '27366',
  'maxi', 'Maxi', 'MAXI', 'mariadb', 'mysql', 'sql', 'mxt', 'MXT', 'mxt_admin',
  'gastromarket', 'gastro', 'gastro123', 'pos', 'server', 'servidor',
  'maxirest1', 'maxirest123', 'maxi123', '123', '0', '0000', '1111',
  'sysdba', 'masterkey', 'rental', 'rental7', 'rental73', 'prorental',
  'maxirest2020', 'maxirest2021', 'maxirest2022', 'maxirest2023', 'maxirest2024',
  'maxirest7', 'v7.1', '7.1', '7.3', 'mx10783', 'mx_10783', 'mx27366', 'mx_27366'
];

let found = null;
for (const w of wordlist) {
  if (mysqlHash(w) === targetHash) {
    found = w;
    break;
  }
}

if (found !== null) {
  console.log(`\n🎉 ENCONTRADO! La contraseña es: "${found}"`);
} else {
  console.log('\nNo encontrado en la lista rápida, probando combinaciones...');
  // Let's test combinations with client numbers, dates, common patterns
  const prefixes = ['', 'mx', 'maxi', 'maxirest', 'user', 'usr', 'db', 'mxt'];
  const seps = ['', '_', '.', '-'];
  const nums = ['0', '1', '7', '71', '73', '10783', '27366', '2024', '2025', '2026', '123'];
  
  for (const p of prefixes) {
    for (const s of seps) {
      for (const n of nums) {
        const c1 = `${p}${s}${n}`;
        const c2 = `${n}${s}${p}`;
        if (mysqlHash(c1) === targetHash) { found = c1; break; }
        if (mysqlHash(c2) === targetHash) { found = c2; break; }
      }
      if (found) break;
    }
    if (found) break;
  }
  
  if (found) {
    console.log(`\n🎉 ENCONTRADO en combinaciones! La contraseña es: "${found}"`);
  } else {
    console.log('Target hash:', targetHash);
  }
}
