const fs = require('fs');
const errLog = 'C:\\Servidor_MariaDB\\DESKTOP-VQ6TGN0.err';
const content = fs.readFileSync(errLog, 'latin1');
const lines = content.split('\n');
console.log(`Total líneas en .err: ${lines.length}`);
console.log('Últimas 15 líneas:');
console.log(lines.slice(-15).join('\n'));
