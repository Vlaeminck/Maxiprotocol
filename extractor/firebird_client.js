/**
 * MaxiProtocol - Conector Nativo a Base de Datos Firebird (Maxirest POS)
 * Diseñado para extracción continua en modo SOLO LECTURA sin bloqueos.
 */

class FirebirdClient {
  constructor(config = {}) {
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 3050,
      database: config.database || 'C:\\MaxiRest\\Datos\\MAXIREST.FDB',
      user: config.user || 'SYSDBA',
      password: config.password || 'masterkey',
      lowercase_keys: false,
      role: null,
      pageSize: 4096
    };

    this.isConnected = false;
    this.driverAvailable = false;
    this.firebird = null;

    this.initDriver();
  }

  initDriver() {
    try {
      this.firebird = require('node-firebird');
      this.driverAvailable = true;
      console.log('[FirebirdClient] Driver node-firebird disponible.');
    } catch (err) {
      console.log('[FirebirdClient] node-firebird no instalado o compilación nativa omitida. Operando en modo puente/fallback.');
      this.driverAvailable = false;
    }
  }

  /**
   * Intenta conectar con la base de datos Firebird de Maxirest
   */
  async testConnection() {
    if (!this.driverAvailable) {
      return {
        success: false,
        message: 'Driver node-firebird no disponible en este entorno local.',
        mode: 'SIMULATION_READY'
      };
    }

    return new Promise((resolve) => {
      this.firebird.attach(this.config, (err, db) => {
        if (err) {
          this.isConnected = false;
          resolve({
            success: false,
            error: err.message,
            code: err.code || 'ERR_ATTACH_FAILED'
          });
          return;
        }

        this.isConnected = true;
        // Cerrar conexión de prueba inmediatamente
        db.detach();
        resolve({
          success: true,
          message: `Conectado exitosamente a Maxirest en ${this.config.host}:${this.config.port}`
        });
      });
    });
  }

  /**
   * Ejecuta una consulta SQL en modo READ ONLY con nivel de aislamiento READ COMMITTED
   */
  async executeReadOnlyQuery(sqlQuery, params = []) {
    if (!this.driverAvailable || !this.isConnected) {
      throw new Error('Conexión Firebird no disponible.');
    }

    return new Promise((resolve, reject) => {
      this.firebird.attach(this.config, (err, db) => {
        if (err) return reject(err);

        // Opciones de transacción segura para evitar bloqueos con el POS Maxirest
        const options = {
          isolation: this.firebird.ISOLATION_READ_COMMITED,
          readOnly: true
        };

        db.transaction(options, (err, tr) => {
          if (err) {
            db.detach();
            return reject(err);
          }

          tr.query(sqlQuery, params, (err, result) => {
            if (err) {
              tr.rollback(() => db.detach());
              return reject(err);
            }

            tr.commit((err) => {
              db.detach();
              if (err) return reject(err);
              resolve(result);
            });
          });
        });
      });
    });
  }

  /**
   * Inspecciona las tablas existentes en la base de datos de Maxirest
   */
  async inspectSchema() {
    const query = `
      SELECT TRIM(RDB$RELATION_NAME) AS TABLE_NAME
      FROM RDB$RELATIONS
      WHERE RDB$VIEW_BLR IS NULL 
        AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
      ORDER BY RDB$RELATION_NAME;
    `;
    return this.executeReadOnlyQuery(query);
  }

  /**
   * Queries de extracción estándar para Maxirest
   */
  getQueries() {
    return {
      mesas: `
        SELECT 
          M.ID_MESA, M.NUMERO_MESA, M.SECTOR, M.ESTADO, 
          M.CANT_PERSONAS, M.HORA_APERTURA, M.ID_MOZO,
          MOZ.NOMBRE AS MOZO_NOMBRE
        FROM MESAS M
        LEFT JOIN MOZOS MOZ ON M.ID_MOZO = MOZ.ID_MOZO;
      `,
      comandasActivas: `
        SELECT 
          CD.ID_DETALLE, C.ID_COMANDA, M.NUMERO_MESA, 
          A.DESCRIPCION AS ARTICULO, CD.CANTIDAD, CD.HORA_PEDIDO, 
          CD.ESTADO, R.DESCRIPCION AS RUBRO
        FROM COMANDAS_DETALLE CD
        JOIN COMANDAS C ON CD.ID_COMANDA = C.ID_COMANDA
        JOIN MESAS M ON C.ID_MESA = M.ID_MESA
        JOIN ARTICULOS A ON CD.ID_ARTICULO = A.ID_ARTICULO
        LEFT JOIN RUBROS R ON A.ID_RUBRO = R.ID_RUBRO
        WHERE CD.ESTADO IN ('MARCHANDO', 'PENDIENTE')
        ORDER BY CD.HORA_PEDIDO ASC;
      `,
      ventasDelDia: `
        SELECT 
          COUNT(V.ID_VENTA) AS TOTAL_TICKETS,
          COALESCE(SUM(V.TOTAL), 0) AS TOTAL_FACTURADO,
          COALESCE(AVG(V.TOTAL), 0) AS TICKET_PROMEDIO,
          COALESCE(SUM(V.CANT_CUBIERTOS), 0) AS TOTAL_CUBIERTOS
        FROM VENTAS V
        WHERE V.FECHA = CURRENT_DATE AND V.ESTADO <> 'ANULADA';
      `
    };
  }
}

module.exports = FirebirdClient;
