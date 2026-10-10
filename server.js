const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

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
const fs = require('fs');
let initialConfig = {};
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    initialConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[MaxiProtocol] Configuración cargada desde config.json:', initialConfig);
  } catch (e) {}
}

// Instancias del sistema
const firebird = new FirebirdClient(initialConfig);
const simulator = new RestaurantSimulator();

let currentMode = initialConfig.mode || 'SIMULATOR'; // 'FIREBIRD' o 'SIMULATOR'
let pollingIntervalMs = 2500;
let pollingTimer = null;

// Rutas API REST
app.get('/api/status', async (req, res) => {
  const fbStatus = await firebird.testConnection();
  res.json({
    status: 'ONLINE',
    systemName: 'MaxiProtocol Live Engine',
    currentMode: currentMode,
    firebirdConfig: {
      host: firebird.config.host,
      port: firebird.config.port,
      database: firebird.config.database,
      driverAvailable: firebird.driverAvailable
    },
    firebirdTest: fbStatus
  });
});

app.get('/api/snapshot', (req, res) => {
  const data = simulator.getSnapshot();
  res.json(data);
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'FIREBIRD' || mode === 'SIMULATOR') {
    currentMode = mode;
    console.log(`[MaxiProtocol] Modo de extracción cambiado a: ${currentMode}`);
    io.emit('mode_changed', { mode: currentMode });
    return res.json({ success: true, mode: currentMode });
  }
  res.status(400).json({ error: 'Modo inválido. Usar FIREBIRD o SIMULATOR.' });
});

app.post('/api/config/firebird', (req, res) => {
  const { host, port, database, user, password } = req.body;
  if (host) firebird.config.host = host;
  if (port) firebird.config.port = Number(port);
  if (database) firebird.config.database = database;
  if (user) firebird.config.user = user;
  if (password) firebird.config.password = password;

  try {
    const toSave = {
      ...firebird.config,
      mode: currentMode
    };
    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), 'utf8');
  } catch (e) {}

  console.log('[MaxiProtocol] Configuración de Firebird actualizada y persistida en disco.');
  res.json({ success: true, config: firebird.config });
});

// Socket.io - Comunicación en tiempo real
io.on('connection', (socket) => {
  console.log(`[Socket.io] Nuevo cliente conectado al Dashboard: ${socket.id}`);

  // Enviar estado inicial inmediato al conectar
  const initialSnapshot = simulator.getSnapshot();
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
      if (currentMode === 'FIREBIRD' && firebird.isConnected) {
        // En modo Firebird Real se ejecutan las consultas de Solo Lectura
        // y se procesan los deltas hacia el frontend
        // ...
      } else {
        // Modo Simulador de Alta Fidelidad
        const { eventos, snapshot } = simulator.tick();

        // Emitir snapshot consolidado
        io.emit('tick_update', snapshot);

        // Emitir eventos individuales para notificaciones y alertas auditivas/visuales
        eventos.forEach(evt => {
          io.emit('live_event', evt);
        });
      }
    } catch (err) {
      console.error('[MaxiProtocol Engine Error]:', err.message);
    }
  }, pollingIntervalMs);
}

startStreamingLoop();

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MaxiProtocol Dashboard en Tiempo Real`);
  console.log(`📡 Servidor escuchando en: http://localhost:${PORT}`);
  console.log(`🔌 Motor de datos: Modo ${currentMode}`);
  console.log(`=======================================================`);
});
