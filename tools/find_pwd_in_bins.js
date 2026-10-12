const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const targetHash = 'c1b7f8b962a21262aaf6f154e6fa0a31f1edb121';

function mysqlHash(pwd) {
  const s1 = crypto.createHash('sha1').update(pwd).digest();
  return crypto.createHash('sha1').update(s1).digest('hex').toLowerCase();
}

console.log('=== BUSCANDO CONTRASEÑA DE MARIADB EN MAXIREST ===\n');

// 1. Extraer todas las cadenas de texto ASCII de longitud entre 4 y 30 de ejecutables y scripts clave
const filesToScan = [
  'C:\\MaxiREST_SQL\\MAXIREST.EXE',
  'C:\\MaxiREST_SQL\\actsqlma.exe',
  'C:\\MaxiADMIN\\ACTSQLMA.EXE',
  'C:\\MaxiADMIN\\actinstalv6.exe',
  'C:\\MaxiREST_SQL\\CLAVE.DLL',
  'C:\\MaxiREST_SQL\\CLAVER1.DLL',
  'C:\\MaxiREST_SQL\\CODIGOBARRA.CFG'
];

let tested = new Set();
let matchFound = null;

function testString(s) {
  if (tested.has(s)) return;
  tested.add(s);
  if (mysqlHash(s) === targetHash) {
    matchFound = s;
    console.log(`\n🎉🎉🎉 ¡CONTRASEÑA ENCONTRADA EN BINARIOS!: "${s}"\n`);
  }
}

filesToScan.forEach(fp => {
  if (matchFound) return;
  if (!fs.existsSync(fp)) return;
  console.log(`Analizando ${fp}...`);
  try {
    const buf = fs.readFileSync(fp);
    let cur = '';
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b >= 33 && b <= 126) {
        cur += String.fromCharCode(b);
      } else {
        if (cur.length >= 3 && cur.length <= 32) {
          testString(cur);
          if (matchFound) break;
        }
        cur = '';
      }
    }
  } catch (e) {}
});

if (matchFound) {
  console.log(`EXITO DEFINITIVO: La contraseña es "${matchFound}"`);
} else {
  console.log(`Se probaron ${tested.size} cadenas extraídas de binarios.`);
}
