const fs = require('fs');

const p = 'C:\\MaxiREST_SQL\\OFFLINE-ORDERING-API-SOCKET.EXE';
const buf = fs.readFileSync(p);
const str = buf.toString('latin1');

console.log('File size:', buf.length);

const terms = ['3399', 'mx_', 'root', 'user_', 'password', 'Password', 'mariadb', 'mysql', '10783', 'v7.1', 'connection'];
terms.forEach(term => {
  let pos = 0;
  let count = 0;
  while ((pos = str.indexOf(term, pos)) !== -1 && count < 10) {
    const s = str.slice(Math.max(0, pos - 40), Math.min(str.length, pos + 80)).replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
    console.log(`[${term}] @ ${pos}: ${s.trim()}`);
    pos += term.length + 10;
    count++;
  }
});
