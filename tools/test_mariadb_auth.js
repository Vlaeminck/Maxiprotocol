const mysql = require('mysql2/promise');

async function test() {
  const users = ['root', 'maxirest', 'caja', 'mx', 'mx_10783', 'admin'];
  const passwords = ['', '1234', 'maxirest', 'root', 'mariadb', 'masterkey', 'gastro', '10783', 'mx10783', 'maxi', 'MaxiRest', '123456', 'sa'];
  
  for (const u of users) {
    for (const p of passwords) {
      try {
        const conn = await mysql.createConnection({
          host: '192.168.1.3',
          port: 3399,
          user: u,
          password: p,
          database: 'mx_10783',
          connectTimeout: 2000
        });
        console.log(`>>> SUCCESS: user=${u}, password="${p}"`);
        const [rows] = await conn.query('SHOW TABLES');
        console.log(`Found ${rows.length} tables!`);
        await conn.end();
        return;
      } catch (e) {
        // If access denied, report message
        if (!e.message.includes('Access denied')) {
          console.log(`Error (${u}):`, e.message);
          return;
        }
      }
    }
  }
  console.log('Finished testing common combinations - all Access Denied.');
}

test();
