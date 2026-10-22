const { execSync } = require('child_process');

const mysqlPath = 'C:\\Servidor_MariaDB\\bin\\mysql.exe';
const host = '192.168.1.6';
const port = 3399;

const users = ['root', 'maxiprotocol', 'user_10783', 'maxirest', 'admin'];
const passwords = ['', 'Maxi2026!*', 'maxirest', '10783', 'mx10783', 'root', 'admin', 'masterkey', 'gastro', 'gastromarket'];

console.log(`Probando conexion a MariaDB en ${host}:${port}...`);

for (const u of users) {
  for (const p of passwords) {
    const cmd = `"${mysqlPath}" -h ${host} -P ${port} -u ${u} ${p ? `-p"${p}"` : ''} -e "SHOW DATABASES;"`;
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`\n🎉 CONEXIÓN EXITOSA! Usuario: "${u}" | Contraseña: "${p}"`);
      console.log(out);
      process.exit(0);
    } catch (err) {
      // Access denied or failed
    }
  }
}

console.log('No se pudo acceder con combinaciones por defecto (Acceso Denegado / Requiere crear usuario localmente en el Servidor).');
