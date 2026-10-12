const fs = require('fs');

console.log('=== LEYENDO MaxiREST.ini ===');
try {
  const iniContent = fs.readFileSync('C:\\MaxiRest\\MaxiREST.ini', 'latin1');
  console.log(iniContent);
} catch (e) {
  console.error('Error:', e.message);
}
