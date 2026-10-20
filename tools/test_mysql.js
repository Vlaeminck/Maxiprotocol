const { execSync } = require('child_process');

const tests = [
  { u: 'root', p: '' },
  { u: 'root', p: 'maxirest' },
  { u: 'root', p: 'mariadb' },
  { u: 'user_10783', p: '' },
  { u: 'user_10783', p: '10783' },
  { u: 'user_10783', p: 'maxirest' },
  { u: 'user_10783', p: 'user_10783' },
  { u: 'mx_10783', p: '10783' },
  { u: 'maxi', p: 'maxi' }
];

for (const t of tests) {
  try {
    const pFlag = t.p ? `-p${t.p}` : '';
    const cmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 192.168.1.4 -P 3399 -u ${t.u} ${pFlag} --connect-timeout=2 -e "SHOW DATABASES;"`;
    const res = execSync(cmd, { stdio: 'pipe' }).toString();
    console.log(`SUCCESS with user: ${t.u}, pass: "${t.p}":\n${res}`);
    break;
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString().trim() : err.message;
    console.log(`Failed with user: ${t.u}, pass: "${t.p}": ${msg}`);
  }
}
