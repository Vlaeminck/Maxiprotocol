const net = require('net');

const PROXY_PORT = 3398;
const REMOTE_HOST = '192.168.1.3';
const REMOTE_PORT = 3399;

console.log(`Iniciando prueba de Proxy TCP en localhost:${PROXY_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}...`);

const server = net.createServer(clientSocket => {
  console.log(`[Proxy] Nueva conexion entrante desde ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

  const remoteSocket = net.connect(REMOTE_PORT, REMOTE_HOST, () => {
    console.log(`[Proxy] Enlace establecido con el Servidor Caja en ${REMOTE_HOST}:${REMOTE_PORT}`);
  });

  clientSocket.on('data', data => {
    // Interceptar comando MySQL (Byte 4 = COM_QUERY = 0x03)
    if (data.length > 5 && data[4] === 0x03) {
      const sql = data.slice(5).toString('latin1').trim();
      console.log(`[Proxy SQL Query]: ${sql.slice(0, 150)}`);
    }
    remoteSocket.write(data);
  });

  remoteSocket.on('data', data => {
    clientSocket.write(data);
  });

  clientSocket.on('error', err => console.log('[Proxy Client Error]:', err.message));
  remoteSocket.on('error', err => console.log('[Proxy Remote Error]:', err.message));

  clientSocket.on('close', () => remoteSocket.end());
  remoteSocket.on('close', () => clientSocket.end());
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[Proxy LISTO] Escuchando en 127.0.0.1:${PROXY_PORT}.`);
});
