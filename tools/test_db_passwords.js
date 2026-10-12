const { execSync } = require('child_process');

const users = ['root', 'maxirest', 'maxi', 'caja', 'admin', 'Gardenias', 'tomas'];
const passwords = [
  '',
  'root',
  'maxirest',
  'Maxirest',
  'masterkey',
  '1234',
  '123456',
  'admin',
  'maxi',
  'Maxi',
  'caja',
  'CAJA',
  '10783',
  '27366',
  'mx_27366',
  'mx_10783',
  'mariadb',
  'MariaDB'
];

console.log('=== PROBANDO CREDENCIALES CONTRA MARIADB (PUERTO 3399) ===\n');

for (const u of users) {
  for (const p of passwords) {
    try {
      const pFlag = p === '' ? '' : `-p"${p}"`;
      const cmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 127.0.0.1 -P 3399 -u ${u} ${pFlag} -e "SELECT CURRENT_USER();" 2>&1`;
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      console.log(`🎉 ¡ÉXITO! Usuario: [${u}], Password: [${p}]`);
      console.log(out);
      process.exit(0);
    } catch (e) {
      // Failed attempt
    }
  }
}

console.log('Ninguna de las combinaciones estándar funcionó. Probaremos extracción de hash o skip-grant-tables si es necesario.');
