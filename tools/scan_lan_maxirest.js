const net = require('net');

const ips = [
  '127.0.0.1',
  '192.168.1.1',
  '192.168.1.3',
  '192.168.1.8',
  '192.168.1.9',
  '192.168.1.10',
  '192.168.1.13',
  '192.168.1.14',
  '192.168.1.24',
  '192.168.1.200'
];

const ports = [3399, 3306, 3050, 8080];

console.log('=== ESCANEANDO PUERTOS DE MAXIREST EN LA RED LOCAL ===\n');

let pending = 0;

ips.forEach(ip => {
  ports.forEach(port => {
    pending++;
    const s = new net.Socket();
    s.setTimeout(1200);

    s.connect(port, ip, () => {
      console.log(`🎯 [ABIERTO]: ${ip}:${port} respondiendo!`);
      s.destroy();
      pending--;
      if (pending === 0) process.exit(0);
    });

    s.on('error', () => {
      pending--;
      if (pending === 0) process.exit(0);
    });

    s.on('timeout', () => {
      s.destroy();
      pending--;
      if (pending === 0) process.exit(0);
    });
  });
});

setTimeout(() => {
  console.log('Fin de escaneo de red.');
  process.exit(0);
}, 3000);
