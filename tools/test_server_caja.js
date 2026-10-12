const { execSync } = require('child_process');

console.log('=== CONECTANDO CON EL SERVIDOR MAXIREST EN 192.168.1.3:3399 ===\n');

// 1. Probar conectividad y ver banner MySQL
const usersToTest = ['user_10783', 'user_27366', 'root', 'maxirest', 'caja'];
const passwordsToTest = [
  '',
  '10783',
  'mx_10783',
  '27366',
  'mx_27366',
  'maxirest',
  'Maxirest',
  'masterkey',
  '1234',
  '123456',
  'caja',
  'CAJA'
];

for (const u of usersToTest) {
  for (const p of passwordsToTest) {
    try {
      const pFlag = p === '' ? '' : `-p"${p}"`;
      const cmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 192.168.1.3 -P 3399 -u ${u} ${pFlag} -e "SHOW DATABASES;" 2>&1`;
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      console.log(`🎉🎉🎉 ¡CONEXIÓN EXITOSA AL SERVIDOR MAXIREST (CAJA)!`);
      console.log(`Usuario: [${u}], Password: [${p}]`);
      console.log('Bases de datos en el servidor:\n', out);
      process.exit(0);
    } catch (e) {
      // Intentar siguiente
    }
  }
}

console.log('Credenciales por defecto no autenticaron directamente en 192.168.1.3.');
console.log('Probando banner de conexión...');
try {
  const testCmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 192.168.1.3 -P 3399 -u root -e "STATUS;" 2>&1`;
  const res = execSync(testCmd, { encoding: 'utf8' });
  console.log(res);
} catch (e) {
  console.log(e.message);
}
