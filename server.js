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
const RangeAnalyticsEngine = require('./extractor/range_analytics');
const rangeAnalytics = new RangeAnalyticsEngine(initialConfig.maxirestPath || 'C:\\MaxiRest', analytics);

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
  res.json({
    success: true,
    days: analytics.getAvailableDays(),
    today: analytics.getTodayKey(),
    yesterday: analytics.getYesterdayKey(),
    latestClosedDay: analytics.getLatestClosedAuditedDay()
  });
});

app.get('/api/analytics/day', (req, res) => {
  const dateKey = req.query.date || 'ayer';
  const data = analytics.getDayAnalytics(dateKey);
  res.json({
    success: true,
    data,
    today: analytics.getTodayKey(),
    yesterday: analytics.getYesterdayKey(),
    latestClosedDay: analytics.getLatestClosedAuditedDay()
  });
});

/**
 * End-point de Analítica Multidimensional por Rangos de Fechas
 * Permite seleccionar desde X fecha hasta Y fecha (o presets como quarter, month, 30days, etc.)
 * y entrega:
 * 1. Platos más vendidos (por unidades y facturación)
 * 2. Desglose por categoría/rubro
 * 3. Desglose por franja horaria (cuándo se vende cada plato)
 * 4. Desglose por día (evolución diaria en el período)
 * 5. Quién lo suele vender más (Top Mozos por plato y por período)
 */
app.get('/api/analytics/range', (req, res) => {
  const { preset, from, to, rubro, sort } = req.query;
  const result = rangeAnalytics.queryRange({ preset, from, to, rubro, sort });
  res.json(result);
});

/**
 * Desglose comanda por comanda de artículos vendidos por un mozo
 * Categorías desglosables (acordeón) y detalle plato a plato con cantidades
 * Soporta fecha individual (date=YYYY-MM-DD) o rangos (preset, from, to)
 */
app.get('/api/mozo/sales-breakdown', (req, res) => {
  const { mozo, date, from, to, preset } = req.query;
  if (!mozo) {
    return res.status(400).json({ success: false, error: 'Parámetro mozo requerido' });
  }
  const result = rangeAnalytics.getMozoSalesBreakdown({ mozo, date, from, to, preset });
  res.json(result);
});


// ============================================================================
// GESTIÓN Y ROTACIÓN DE PERSONAL (MOZOS)
// ============================================================================

app.get('/api/staff', (req, res) => {
  const staff = analytics.getStaffRegistry();
  res.json({
    success: true,
    staff,
    total: staff.length,
    activos: staff.filter(s => s.estado === 'ACTIVO').length,
    bajas: staff.filter(s => s.estado === 'BAJA').length
  });
});

app.post('/api/staff/update', (req, res) => {
  const { id, nombre, estado, fechaIngreso, fechaEgreso, periodoActividad, platoMasVendido, postreMasVendido, observaciones } = req.body;
  if (!id) return res.status(400).json({ error: 'ID de mozo requerido' });

  const updated = analytics.updateStaffMember(id, {
    nombre: nombre ? nombre.trim() : undefined,
    estado: estado || undefined,
    fechaIngreso: fechaIngreso !== undefined ? (fechaIngreso || null) : undefined,
    fechaEgreso: fechaEgreso !== undefined ? (fechaEgreso || null) : undefined,
    periodoActividad: periodoActividad || undefined,
    platoMasVendido: platoMasVendido || undefined,
    postreMasVendido: postreMasVendido || undefined,
    observaciones: observaciones || undefined
  });

  if (!updated) {
    return res.status(404).json({ error: 'Mozo no encontrado' });
  }

  const allStaff = analytics.getStaffRegistry();

  // Notificar a clientes conectados con los datos actualizados
  io.emit('staff_updated', { staff: updated, allStaff });
  io.emit('data_synced', { timestamp: Date.now() });

  res.json({ success: true, staff: updated, allStaff });
});

app.post('/api/staff/toggle', (req, res) => {
  const { id, dateKey } = req.body;
  if (!id) return res.status(400).json({ error: 'ID de mozo requerido' });

  const updated = analytics.toggleStaffStatus(id, dateKey);
  if (!updated) {
    return res.status(404).json({ error: 'Mozo no encontrado' });
  }

  const allStaff = analytics.getStaffRegistry();
  io.emit('staff_updated', { staff: updated, allStaff });
  io.emit('data_synced', { timestamp: Date.now() });

  res.json({ success: true, staff: updated, allStaff });
});

// Endpoint de sincronización forzada desde el botón de la UI
app.post('/api/sync', (req, res) => {
  try {
    const result = analytics.syncAll();
    io.emit('data_synced', {
      timestamp: Date.now(),
      today: result.today,
      yesterday: result.yesterday,
      yesterdayData: result.yesterdayData
    });
    io.emit('staff_updated', { staff: result.staff, allStaff: result.staff });
    res.json({
      success: true,
      message: 'Sincronización completada con Maxirest POS',
      yesterday: result.yesterday,
      yesterdayFacturacion: result.yesterdayData ? result.yesterdayData.kpis.facturacionTotal : 0,
      daysCount: result.availableDays.length,
      staffCount: result.staff.length,
      staff: result.staff
    });
  } catch (err) {
    console.error('Error en /api/sync:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de sincronización directa de informes de mozos de Maxirest POS
app.post('/api/mozos/sync-maxirest', (req, res) => {
  try {
    const targetDate = (req.body && req.body.date) ? req.body.date : (req.query.date || analytics.getYesterdayKey());
    const syncRes = analytics.scanAndSyncMozosReports(targetDate);
    const dayData = analytics.getDayAnalytics(targetDate);
    io.emit('staff_updated', { staff: dayData.mozos, allStaff: analytics.getStaffRegistry() });
    io.emit('data_synced', { timestamp: Date.now() });

    res.json({
      success: true,
      message: 'Informe de mozos sincronizado con éxito desde Maxirest POS',
      date: targetDate,
      mozos: dayData.mozos,
      kpis: dayData.kpis
    });
  } catch (err) {
    console.error('Error en /api/mozos/sync-maxirest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auto-sincronización con Maxirest POS (Monitoreo de bakinforme.dbf)
let lastBakinformeMtime = 0;
setInterval(() => {
  try {
    const bakPath = 'C:/MaxiREST_SQL/bakinforme.dbf';
    if (fs.existsSync(bakPath)) {
      const mtime = fs.statSync(bakPath).mtimeMs;
      if (lastBakinformeMtime && mtime > lastBakinformeMtime) {
        console.log('[AutoSync] Cambio detectado en bakinforme.dbf de Maxirest. Sincronizando...');
        analytics.syncAll();
        io.emit('data_synced', { timestamp: Date.now() });
      }
      lastBakinformeMtime = mtime;
    }
  } catch (e) {}
}, 5000);

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
  const todayKey = analytics.getTodayKey();
  const reqDate = req.query.date;

  // Si se solicita una fecha histórica diferente a HOY
  if (reqDate && reqDate !== todayKey && reqDate !== 'hoy' && reqDate !== 'today') {
    const dayData = analytics.getDayAnalytics(reqDate);
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
          Object.entries(dayData.mediosPago || {}).map(([k, v]) => [k, v.importe || 0])
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
    const refAnalytics = analytics.getDayAnalytics(analytics.getYesterdayKey());
    snap.productosTop = snap.productosTop && snap.productosTop.length > 0 ? snap.productosTop : refAnalytics.productosTop;
    snap.distribucionHoraria = snap.distribucionHoraria && snap.distribucionHoraria.length > 0 ? snap.distribucionHoraria : refAnalytics.distribucionHoraria;
    snap.mediosPagoDetalle = snap.mediosPagoDetalle || snap.medios || refAnalytics.mediosPago;
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

// Automatización de extracción y credenciales
const MaxirestAutomation = require('./extractor/maxirest_automation');
const automation = new MaxirestAutomation({
  posExe: initialConfig.systemPaths?.posApp || 'C:\\MaxiREST_SQL\\MAXIREST.EXE',
  sqlDir: 'C:\\MaxiREST_SQL',
  dataDir: initialConfig.systemPaths?.dataDir || 'C:\\MaxiRest',
  credentials: {
    user: initialConfig.automation?.posUser || 'ADMTOM',
    password: initialConfig.automation?.posPassword || 'ADMTOM1'
  }
});

app.get('/api/automation/status', (req, res) => {
  res.json({ success: true, ...automation.getStatus(), user: automation.credentials.user });
});

app.post('/api/automation/credentials', (req, res) => {
  const { user, password, dbPassword } = req.body;
  const result = automation.setCredentials({ user, password, dbPassword });

  try {
    const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    cfg.automation = {
      posUser: user || cfg.automation?.posUser || '',
      posPassword: password || cfg.automation?.posPassword || '',
      lastConfigured: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {}

  res.json({ success: true, message: 'Credenciales de automatización configuradas y guardadas', ...result });
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
        const { snapshot } = currentEngineData;

        // Emitir snapshot consolidado
        io.emit('tick_update', snapshot);
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
