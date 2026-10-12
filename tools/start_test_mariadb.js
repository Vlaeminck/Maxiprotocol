const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

console.log('=== PROBANDO INICIO DE SERVIDOR MARIADB ===\n');

const mysqldPath = 'C:\\Servidor_MariaDB\\bin\\mysqld.exe';
const iniPath = 'C:\\Servidor_MariaDB\\my.ini';

// Primero chequear si ya hay algo en el puerto 3399
const client = new net.Socket();
client.setTimeout(1000);
client.connect(3399, '127.0.0.1', () => {
  console.log('[✓] Puerto 3399 ya está abierto y respondiendo!');
  client.destroy();
  process.exit(0);
});

client.on('error', () => {
  console.log('[!] Puerto 3399 no está activo. Iniciando mysqld...');
  iniciarMysqld();
});

client.on('timeout', () => {
  console.log('[!] Timeout en 3399. Iniciando mysqld...');
  client.destroy();
  iniciarMysqld();
});

function iniciarMysqld() {
  const proc = spawn(mysqldPath, [`--defaults-file=${iniPath}`, '--console'], {
    detached: true,
    stdio: 'pipe'
  });

  proc.stdout.on('data', data => {
    console.log('[mysqld stdout]:', data.toString());
  });

  proc.stderr.on('data', data => {
    console.log('[mysqld stderr]:', data.toString());
  });

  proc.on('error', err => {
    console.error('[mysqld error]:', err.message);
  });

  // Esperar 3 segundos y probar puerto 3399
  setTimeout(() => {
    const testSock = new net.Socket();
    testSock.setTimeout(2000);
    testSock.connect(3399, '127.0.0.1', () => {
      console.log('🎉 ¡MARIADB INICIADO CON ÉXITO Y ESCUCHANDO EN PUERTO 3399!');
      testSock.destroy();
      process.exit(0);
    });
    testSock.on('error', (e) => {
      console.log('Error conectando a 3399 tras inicio:', e.message);
      process.exit(1);
    });
  }, 4000);
}
