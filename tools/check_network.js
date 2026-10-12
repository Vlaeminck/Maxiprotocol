const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== VERIFICANDO RED Y CONECTIVIDAD CON SERVIDOR CAJA ===\n');

// 1. Archivo hosts
try {
  const hosts = fs.readFileSync('C:\\Windows\\System32\\drivers\\etc\\hosts', 'utf8');
  console.log('--- C:\\Windows\\System32\\drivers\\etc\\hosts ---');
  console.log(hosts);
} catch (e) {}

// 2. Ping CAJA
try {
  console.log('\n--- Haciendo ping a CAJA ---');
  const ping = execSync('ping -n 2 CAJA', { encoding: 'utf8' });
  console.log(ping);
} catch (e) {
  console.log('Ping a CAJA falló:', e.message.split('\n')[0]);
}

// 3. Arp -a
try {
  console.log('\n--- Tabla ARP (Equipos en la red LAN) ---');
  const arp = execSync('arp -a', { encoding: 'utf8' });
  console.log(arp);
} catch (e) {}

// 4. Net view
try {
  console.log('\n--- Equipos visibles en red (net view) ---');
  const netView = execSync('net view', { encoding: 'utf8' });
  console.log(netView);
} catch (e) {
  console.log('net view:', e.message.split('\n')[0]);
}
