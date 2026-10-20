const { execSync } = require('child_process');

const users = ['user_10783', 'root', 'ADMTOM', 'admtom', 'mx_10783', 'admin', 'user'];
const pass = 'ADMTOM1';

for (const u of users) {
  try {
    const cmd = `C:\\Servidor_MariaDB\\bin\\mysql.exe -h 192.168.1.4 -P 3399 -u ${u} -p${pass} --connect-timeout=2 -e "SHOW DATABASES;"`;
    const res = execSync(cmd, { stdio: 'pipe' }).toString();
    console.log(`SUCCESS with user: ${u}!\n${res}`);
    process.exit(0);
  } catch(e) {
    const err = e.stderr ? e.stderr.toString().trim() : e.message;
    console.log(`Failed with user: ${u} -> ${err}`);
  }
}
