const { execSync } = require('child_process');

const mysqlPath = 'C:\\Servidor_MariaDB\\bin\\mysql.exe';
const host = '192.168.1.3';
const port = '3399';
const users = ['user_10783', 'root', 'maxirest', 'mxt_admin', 'mx_10783', 'gastro'];

const passwords = [
  '',
  'maxirest',
  'Maxirest',
  'MAXIREST',
  '10783',
  'mx10783',
  'mx_10783',
  'maxirest10783',
  'Maxirest10783',
  '1234',
  '123456',
  'admin',
  'Admin',
  'root',
  'Root',
  'rental',
  'rental7',
  'rental71',
  'rental73',
  'prorental',
  'v7.1',
  '7.1',
  '71',
  '73',
  'gastro',
  'Gastro',
  'gastromarket',
  'mxt',
  'mxt10783',
  'mariadb',
  'mysql',
  'sql',
  'sysdba',
  'masterkey',
  'password',
  'Password'
];

console.log(`Probando conexión a ${host}:${port}...`);

for (const user of users) {
  for (const pwd of passwords) {
    const cmd = `"${mysqlPath}" -h ${host} -P ${port} -u ${user} -p"${pwd}" -e "SELECT 1;"`;
    try {
      const res = execSync(cmd, { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`\n🎉 CONEXIÓN EXITOSA! Usuario: "${user}" | Contraseña: "${pwd}"`);
      process.exit(0);
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString() : '';
      if (!stderr.includes('Access denied')) {
        console.log(`[User ${user} / Pwd ${pwd}] Error:`, stderr.trim());
      }
    }
  }
}

console.log('Finalizadas pruebas básicas sin éxito.');
