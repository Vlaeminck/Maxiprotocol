const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== INSPECCIONANDO PROCESOS Y VENTANAS ===');
try {
  const out = execSync('tasklist /v /fo csv', { encoding: 'latin1' });
  const lines = out.split('\r\n').filter(l => l.trim().length > 0);
  lines.forEach(line => {
    if (line.includes('Maxi') || line.includes('maxi') || line.includes('Conex') || line.includes('DESKTOP') || line.includes('7.')) {
      console.log(line);
    }
  });
} catch (e) {
  console.error(e.message);
}
