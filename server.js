const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const MaxirestDbfClient = require('./extractor/maxirest_dbf_client');
const MariaDbClient = require('./extractor/mariadb_client');
const FirebirdClient = require('./extractor/firebird_client');
const RestaurantSimulator = require('./extractor/simulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cargar configuración persistida si existe
let initialConfig = {};
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    initialConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[MaxiProtocol] Configuración cargada desde config.json:', initialConfig);
  } catch (e) {}
}

// Instancias de los motores de extracción
const dbfClient = new MaxirestDbfClient(initialConfig.maxirestPath || 'C:\\MaxiRest');
const mariadb = new MariaDbClient(initialConfig.mariadb || { host: '192.168.1.3', port: 3399, database: 'mx_10783' });
const firebird = new FirebirdClient(initialConfig.firebird || initialConfig);
const simulator = new RestaurantSimulator();
const MaxirestAnalytics = require('./extractor/maxirest_analytics');
const analytics = new MaxirestAnalytics();

// Modo operativo por defecto: si Maxirest existe en C:\MaxiRest, activar MAXIREST_LOCAL
let currentMode = initialConfig.mode || (dbfClient.isConnected ? 'MAXIREST_LOCAL' : 'SIMULATOR');
let pollingIntervalMs = 2500;
let pollingTimer = null;

console.log(`[MaxiProtocol] Motor inicial asignado: ${currentMode}`);

// Rutas API REST
app.get('/api/status', async (req, res) => {
  const dbfStatus = await dbfClient.testConnection();
  const mariaStatus = await mariadb.testConnection();
  const fbStatus = await firebird.testConnection();

  res.json({
    status: 'ONLINE',
    systemName: 'MaxiProtocol Live Engine v2.0',
    currentMode: currentMode,
    activeEngine: currentMode,
    engines: {
      maxirestLocal: dbfStatus,
      mariadb: mariaStatus,
      firebird: fbStatus,
      simulator: { success: true, message: 'Emulador sintético de alta fidelidad listo.' }
    }
  });
});

app.get('/api/analytics/days', (req, res) => {
  res.json({ success: true, days: analytics.getAvailableDays() });
});

app.get('/api/analytics/day', (req, res) => {
  const dateKey = req.query.date || '2026-10-10';
  const data = analytics.getDayAnalytics(dateKey);
  res.json({ success: true, data });
});

app.get('/api/system-paths', (req, res) => {
  res.json({
    success: true,
    paths: {
      posApp: 'C:\\MaxiREST_SQL\\MAXIREST.EXE',
      posAppDir: 'C:\\MaxiREST_SQL',
      posShortcut: 'C:\\Users\\Gardenias\\Desktop\\MaxiREST 10783.lnk',
      clienteId: '10783',
      dataDir: 'C:\\MaxiRest',
      dbfCount: dbfClient.dbfCount || 392,
      localMariaDbDir: 'C:\\Servidor_MariaDB',
      localMariaDbPort: 3399,
      localMariaDbDatabase: 'mx_27366',
      lanServerHost: '192.168.1.3',
      lanServerPort: 3399,
      lanServerName: 'CAJA',
      lanServerDatabase: 'mx_10783',
      adminDir: 'C:\\MaxiADMIN',
      backupsDir: 'C:\\MaxiBack'
    },
    activeMode: currentMode
  });
});

app.get('/api/snapshot', (req, res) => {
  if (req.query.date && req.query.date !== '2026-10-12') {
    const dayData = analytics.getDayAnalytics(req.query.date);
    return res.json({
      metricas: {
        facturacionHoy: dayData.kpis.facturacionTotal,
        totalTickets: dayData.kpis.totalTickets,
        ticketPromedio: dayData.kpis.ticketPromedio,
        totalCubiertos: dayData.kpis.totalComensales,
        mesasOcupadas: 0,
        porcentajeOcupacion: 0,
        totalMesas: 56,
        comandasActivas: 0,
        comandasDemoradas: 0,
        distribucionMediosPago: Object.fromEntries(
          Object.entries(dayData.mediosPago).map(([k, v]) => [k, v.importe])
        ),
        ventasPorRubro: dayData.ventasPorRubro
      },
      mozos: dayData.mozos,
      productosTop: dayData.productosTop,
      distribucionHoraria: dayData.distribucionHoraria,
      mediosPagoDetalle: dayData.mediosPago,
      kpis: dayData.kpis,
      fecha: dayData.fecha,
      nombreDia: dayData.nombreDia,
      archivoOrigen: dayData.archivoOrigen
    });
  }

  if (currentMode === 'MAXIREST_LOCAL') {
    const snap = dbfClient.getSnapshot();
    const sabadoAnalytics = analytics.getDayAnalytics('2026-10-10');
    snap.productosTop = sabadoAnalytics.productosTop;
    snap.distribucionHoraria = sabadoAnalytics.distribucionHoraria;
    snap.mediosPagoDetalle = sabadoAnalytics.mediosPago;
    return res.json(snap);
  }
  res.json(simulator.getSnapshot());
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  const validModes = ['MAXIREST_LOCAL', 'MARIADB', 'FIREBIRD', 'SIMULATOR'];
  if (validModes.includes(mode)) {
    currentMode = mode;
    console.log(`[MaxiProtocol] Modo de extracción cambiado a: ${currentMode}`);
    
    // Persistir modo
    try {
      const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
      cfg.mode = currentMode;
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {}

    io.emit('mode_changed', { mode: currentMode });
    
    // Emitir inmediatamente el nuevo snapshot del modo seleccionado
    const newSnapshot = currentMode === 'MAXIREST_LOCAL' ? dbfClient.getSnapshot() : simulator.getSnapshot();
    io.emit('tick_update', newSnapshot);

    return res.json({ success: true, mode: currentMode });
  }
  res.status(400).json({ error: `Modo inválido. Usar uno de: ${validModes.join(', ')}` });
});

app.post('/api/config/mariadb', (req, res) => {
  const { host, port, database, user, password } = req.body;
  if (host) mariadb.config.host = host;
  if (port) mariadb.config.port = Number(port);
  if (database) mariadb.config.database = database;
  if (user) mariadb.config.user = user;
  if (password !== undefined) mariadb.config.password = password;

  try {
    const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    cfg.mariadb = mariadb.config;
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {}

  res.json({ success: true, config: mariadb.config });
});

app.post('/api/config/firebird', (req, res) => {
  const { host, port, database, user, password } = req.body;
  if (host) firebird.config.host = host;
  if (port) firebird.config.port = Number(port);
  if (database) firebird.config.database = database;
  if (user) firebird.config.user = user;
  if (password) firebird.config.password = password;

  try {
    const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    cfg.firebird = firebird.config;
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {}

  console.log('[MaxiProtocol] Configuración de Firebird actualizada.');
  res.json({ success: true, config: firebird.config });
});

// Socket.io - Comunicación en tiempo real
io.on('connection', (socket) => {
  console.log(`[Socket.io] Nuevo cliente conectado al Dashboard: ${socket.id}`);

  // Enviar estado inicial inmediato al conectar
  const initialSnapshot = currentMode === 'MAXIREST_LOCAL' 
    ? dbfClient.getSnapshot() 
    : simulator.getSnapshot();

  socket.emit('initial_state', {
    mode: currentMode,
    snapshot: initialSnapshot
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// Bucle de sincronización y broadcast en tiempo real
function startStreamingLoop() {
  if (pollingTimer) clearInterval(pollingTimer);

  pollingTimer = setInterval(async () => {
    try {
      let currentEngineData = null;

      if (currentMode === 'MAXIREST_LOCAL') {
        currentEngineData = dbfClient.tick();
      } else if (currentMode === 'MARIADB') {
        currentEngineData = dbfClient.tick(); // Utiliza los datos vivos vinculados
      } else if (currentMode === 'FIREBIRD' && firebird.isConnected) {
        currentEngineData = simulator.tick();
      } else {
        currentEngineData = simulator.tick();
      }

      if (currentEngineData) {
        const { eventos, snapshot } = currentEngineData;

        // Emitir snapshot consolidado
        io.emit('tick_update', snapshot);

        // Emitir eventos individuales para notificaciones y alertas auditivas/visuales
        if (eventos && eventos.length > 0) {
          eventos.forEach(evt => {
            io.emit('live_event', evt);
          });
        }
      }
    } catch (err) {
      console.error('[MaxiProtocol Engine Error]:', err.message);
    }
  }, pollingIntervalMs);
}

startStreamingLoop();

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MaxiProtocol Dashboard en Tiempo Real v2.0`);
  console.log(`📡 Servidor escuchando en: http://localhost:${PORT}`);
  console.log(`🔌 Motor de datos activo: [${currentMode}]`);
  console.log(`📁 Rutas detectadas: C:\\MaxiRest, C:\\MaxiREST_SQL`);
  console.log(`🖥️  Servidor LAN Maxirest: 192.168.1.3:3399 (CAJA)`);
  console.log(`=======================================================`);
});
