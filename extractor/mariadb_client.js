/**
 * MaxiProtocol - Cliente Conector MariaDB / MySQL para Maxirest POS
 * Permite conectarse al motor SQL de Maxirest en el puerto 3399 (Local o Servidor CAJA en LAN)
 */

const net = require('net');

class MariaDbClient {
  constructor(config = {}) {
    this.config = {
      host: config.host || '192.168.1.3',
      port: config.port || 3399,
      database: config.database || 'mx_10783',
      user: config.user || 'user_10783',
      password: config.password || ''
    };

    this.isConnected = false;
  }

  async testConnection() {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      const startTime = Date.now();

      socket.connect(this.config.port, this.config.host, () => {
        const latency = Date.now() - startTime;
        this.isConnected = true;
        socket.destroy();
        resolve({
          success: true,
          message: `Conexión TCP establecida con Servidor Maxirest SQL en ${this.config.host}:${this.config.port} (Latencia: ${latency}ms).`,
          latencyMs: latency,
          database: this.config.database
        });
      });

      socket.on('error', (err) => {
        this.isConnected = false;
        resolve({
          success: false,
          error: `No se pudo conectar al servidor Maxirest SQL en ${this.config.host}:${this.config.port}: ${err.message}`
        });
      });

      socket.on('timeout', () => {
        this.isConnected = false;
        socket.destroy();
        resolve({
          success: false,
          error: `Tiempo de espera agotado conectando a ${this.config.host}:${this.config.port}`
        });
      });
    });
  }
}

module.exports = MariaDbClient;
