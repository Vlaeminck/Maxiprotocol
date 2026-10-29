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
const { categoriesCatalog } = require('./extractor/categories_catalog');

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

// Catálogo Maestro de Categorías (Rubros) y Subcategorías (Subrubros) de Maxirest POS
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    source: categoriesCatalog.latestRankingSource,
    mtime: categoriesCatalog.latestRankingMtime,
    categories: categoriesCatalog.getActiveCategoriesList(),
    subcategories: categoriesCatalog.getActiveSubcategoriesList()
  });
});

// Endpoint de sincronización forzada desde los botones de la UI (Autonomía Total)
app.all(['/api/sync', '/api/sync-exported'], (req, res) => {
  try {
    categoriesCatalog.reload();
    const result = analytics.syncAll();
    io.emit('data_synced', {
      timestamp: Date.now(),
      today: result.today,
      yesterday: result.yesterday,
      yesterdayData: result.yesterdayData,
      latestClosedDay: result.latestClosedDay,
      latestFacturacion: result.latestFacturacion,
      syncedDates: result.syncedDates,
      syncedDatesCount: result.syncedDatesCount
    });
    io.emit('staff_updated', { staff: result.staff, allStaff: result.staff });

    const yFact = result.yesterdayData ? result.yesterdayData.kpis.facturacionTotal : 0;
    const yTickets = result.yesterdayData ? result.yesterdayData.kpis.totalTickets : 0;
    const yCubs = result.yesterdayData ? result.yesterdayData.kpis.totalComensales : 0;

    res.json({
      success: true,
      message: `Sincronización completada con éxito. ${result.syncedDatesCount} fechas procesadas desde Maxirest POS.`,
      today: result.today,
      yesterday: result.yesterday,
      yesterdayFacturacion: yFact,
      yesterdayTickets: yTickets,
      yesterdayCubiertos: yCubs,
      latestClosedDay: result.latestClosedDay,
      latestFacturacion: result.latestFacturacion,
      syncedDates: result.syncedDates,
      syncedDatesCount: result.syncedDatesCount,
      datesDetails: result.datesDetails,
      totalFacturadoReciente: result.totalFacturadoReciente,
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

// ============================================================================
// CENTRO DE EXPORTACIÓN Y EXTRACCIÓN DE DATOS DE MAXIREST POS (CSV / EXCEL)
// ============================================================================

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. Exportar Balance Integral del Día Seleccionado
app.get('/api/export/day', (req, res) => {
  try {
    const dateKey = req.query.date || analytics.getYesterdayKey();
    const day = analytics.getDayAnalytics(dateKey);
    const kpis = day.kpis || {};

    let csv = '\uFEFF'; // UTF-8 BOM para compatibilidad nativa con Excel en Windows
    csv += 'REPORTE Y BALANCE DE OPERACIONES - MAXIREST POS CLIENTE #10783\n';
    csv += `Empresa;Gastro Market SRL / Gardenias Restó\n`;
    csv += `Fecha Operativa;${day.fecha}\n`;
    csv += `Día;${day.nombreDia}\n`;
    csv += `Archivo DBF / Origen;${day.archivoOrigen}\n`;
    csv += `Generado;${new Date().toLocaleString('es-AR')}\n\n`;

    csv += '=== KPIS PRINCIPALES ===\n';
    csv += 'Métrica;Valor;Unidad / Detalle\n';
    csv += `Facturación Neta Total;${kpis.facturacionTotal || 0};ARS\n`;
    csv += `Total Comprobantes (Tickets);${kpis.totalTickets || 0};Tickets\n`;
    csv += `Total Comensales (Cubiertos CUB);${kpis.totalComensales || 0};Comensales\n`;
    csv += `Ticket Promedio;${kpis.ticketPromedio || 0};ARS / Ticket\n`;
    csv += `Gasto Promedio por Comensal;${kpis.gastoPromedioComensal || 0};ARS / Cub\n\n`;

    csv += '=== CANALES DE VENTA ===\n';
    csv += 'Canal;Facturado ARS;% del Total\n';
    const c = kpis.canales || {};
    const totF = kpis.facturacionTotal || 1;
    csv += `Salón;${c.salon || 0};${(((c.salon || 0) / totF) * 100).toFixed(1)}%\n`;
    csv += `Mostrador / Take Away;${c.mostrador || 0};${(((c.mostrador || 0) / totF) * 100).toFixed(1)}%\n`;
    csv += `Delivery / Envíos;${c.domicilio || 0};${(((c.domicilio || 0) / totF) * 100).toFixed(1)}%\n\n`;

    csv += '=== MEDIOS DE COBRO Y PAGO ===\n';
    csv += 'Medio de Cobro;Importe ARS;% del Total;Tickets\n';
    if (day.mediosPago && Object.keys(day.mediosPago).length > 0) {
      for (const [mName, mData] of Object.entries(day.mediosPago)) {
        csv += `${escapeCsv(mName)};${mData.importe};${mData.porcentaje}%;${mData.tickets || 0}\n`;
      }
    }
    csv += '\n';

    csv += '=== RENDIMIENTO DEL EQUIPO (MOZOS Y ESTACIONES) ===\n';
    csv += 'Código POS;Nombre Mozo;Estado;Ventas ARS;% del Total;Tickets;Cubiertos;Ticket Promedio;Promedio Cubierto;Plato Más Vendido;Postre Insignia\n';
    if (day.mozos && day.mozos.length > 0) {
      day.mozos.forEach(m => {
        const postreNom = (m.postres && m.postres.postreTop) ? m.postres.postreTop : '-';
        csv += `${m.codigo};${escapeCsv(m.nombre)};${m.estado};${m.ventas};${m.porcentajeTotal}%;${m.tickets};${m.cubiertos || m.comensales || 0};${m.ticketPromedio};${m.promedioCubierto};${escapeCsv(m.platoMasVendido || '-')};${escapeCsv(postreNom)}\n`;
      });
    }
    csv += '\n';

    csv += '=== DISTRIBUCIÓN POR CATEGORÍAS / RUBROS ===\n';
    csv += 'Rubro / Categoría;Facturado ARS;% del Total\n';
    if (day.ventasPorRubro && Object.keys(day.ventasPorRubro).length > 0) {
      for (const [rName, rVal] of Object.entries(day.ventasPorRubro)) {
        const pct = totF > 0 ? ((rVal / totF) * 100).toFixed(1) : '0';
        csv += `${escapeCsv(rName)};${rVal};${pct}%\n`;
      }
    }
    csv += '\n';

    csv += '=== INGENIERÍA DE MENÚ (TOP PRODUCTOS / PLATOS) ===\n';
    csv += 'Código;Artículo / Plato;Rubro;Unidades;Precio Unitario ARS;Facturación ARS;% del Total\n';
    if (day.productosTop && day.productosTop.length > 0) {
      day.productosTop.forEach(p => {
        csv += `${escapeCsv(p.codigo || 'ART')};${escapeCsv(p.nombre)};${escapeCsv(p.rubro || 'General')};${p.unidades};${p.unitario};${p.facturado};${p.porcentaje}%\n`;
      });
    }
    csv += '\n';

    csv += '=== CURVA HORARIA OPERATIVA ===\n';
    csv += 'Franja Horaria;Facturado ARS;Tickets\n';
    if (day.distribucionHoraria && day.distribucionHoraria.length > 0) {
      day.distribucionHoraria.forEach(h => {
        csv += `${h.hora};${h.importe};${h.tickets}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Maxirest_Balance_${day.fecha}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error en /api/export/day:', err);
    res.status(500).send('Error exportando reporte diario');
  }
});

// 2. Exportar Desempeño de Mozos (CSV)
app.get('/api/export/mozos', (req, res) => {
  try {
    const dateKey = req.query.date || analytics.getYesterdayKey();
    const day = analytics.getDayAnalytics(dateKey);

    let csv = '\uFEFF';
    csv += 'Código;Mozo;Estado;Ventas_ARS;Porcentaje_Total;Tickets;Cubiertos_CUB;Ticket_Promedio;Promedio_Cubierto;Plato_Mas_Vendido;Postre_Insignia;Unidades_Postres;Fecha_Ingreso\n';
    if (day.mozos && day.mozos.length > 0) {
      day.mozos.forEach(m => {
        const postreNom = (m.postres && m.postres.postreTop) ? m.postres.postreTop : '-';
        const postreUnits = (m.postres && m.postres.unidades) ? m.postres.unidades : 0;
        csv += `${m.codigo};${escapeCsv(m.nombre)};${m.estado};${m.ventas};${m.porcentajeTotal};${m.tickets};${m.cubiertos || m.comensales || 0};${m.ticketPromedio};${m.promedioCubierto};${escapeCsv(m.platoMasVendido || '-')};${escapeCsv(postreNom)};${postreUnits};${m.fechaIngreso || '-'}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Maxirest_Mozos_${day.fecha}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error en /api/export/mozos:', err);
    res.status(500).send('Error exportando mozos');
  }
});

// 3. Exportar Menú / Artículos (CSV)
app.get('/api/export/products', (req, res) => {
  try {
    const dateKey = req.query.date || analytics.getYesterdayKey();
    const day = analytics.getDayAnalytics(dateKey);

    let csv = '\uFEFF';
    csv += 'Código;Artículo;Rubro;Unidades;Precio_Unitario_ARS;Facturado_ARS;Porcentaje_Total\n';
    if (day.productosTop && day.productosTop.length > 0) {
      day.productosTop.forEach(p => {
        csv += `${escapeCsv(p.codigo || 'ART')};${escapeCsv(p.nombre)};${escapeCsv(p.rubro || 'General')};${p.unidades};${p.unitario};${p.facturado};${p.porcentaje}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Maxirest_Menu_${day.fecha}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error en /api/export/products:', err);
    res.status(500).send('Error exportando platos');
  }
});

// 4. Exportar Histórico Multi-Anual Completo (1.965 Días 2020-2026)
app.get('/api/export/history', (req, res) => {
  try {
    const masterIdx = analytics.getMasterFiscalIndex();
    const dateKeys = Object.keys(masterIdx).sort();

    let csv = '\uFEFF';
    csv += 'Fecha;Año;Mes;Día;Facturación_Total_ARS;Tickets_Ventas;Cubiertos_CUB;Ticket_Promedio;Promedio_Cubierto;Salon_ARS;Mostrador_ARS;Delivery_ARS\n';

    dateKeys.forEach(dk => {
      const row = masterIdx[dk];
      const p = dk.split('-');
      csv += `${dk};${p[0]};${p[1]};${p[2]};${row.total};${row.ventas};${row.cub || 0};${row.promVtas || 0};${row.promedioCub || 0};${row.salon || 0};${row.mostrador || 0};${row.domicilio || 0}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Maxirest_Historico_Completo_${dateKeys.length}_Dias.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error en /api/export/history:', err);
    res.status(500).send('Error exportando histórico');
  }
});

// Auto-sincronización y Monitoreo Inteligente con Maxirest POS
let lastBakinformeMtime = (() => {
  const p = 'C:/MaxiREST_SQL/bakinforme.dbf';
  return fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0;
})();
let lastMaxirestDirMtime = (() => {
  const p = 'C:/MaxiRest';
  return fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0;
})();
let lastDesktopXlsMtime = 0;
let lastDownloadsXlsMtime = 0;

setInterval(() => {
  try {
    let needsSync = false;
    let reason = '';

    // 1. Monitoreo de bakinforme.dbf (cierre contable diario / arqueo / informe detallado)
    const bakPath = 'C:/MaxiREST_SQL/bakinforme.dbf';
    if (fs.existsSync(bakPath)) {
      const mtime = fs.statSync(bakPath).mtimeMs;
      if (lastBakinformeMtime && mtime > lastBakinformeMtime) {
        reason = 'bakinforme.dbf modificado';
        needsSync = true;
      }
      lastBakinformeMtime = mtime;
    }

    // 2. Monitoreo de C:/MaxiRest (nuevas tablas DBF generadas por informes de Maxirest)
    const maxirestDir = 'C:/MaxiRest';
    if (fs.existsSync(maxirestDir)) {
      try {
        const dirMtime = fs.statSync(maxirestDir).mtimeMs;
        if (lastMaxirestDirMtime && dirMtime > lastMaxirestDirMtime) {
          reason = 'nuevas tablas DBF exportadas en C:\\MaxiRest';
          needsSync = true;
        }
        lastMaxirestDirMtime = dirMtime;
      } catch (_) {}
    }

    // 3. Monitoreo de reportes .xls emitidos al Escritorio o Descargas por Maxirest
    const checkFolders = [
      { path: 'C:/Users/Gardenias/Desktop', lastTime: lastDesktopXlsMtime, setTime: (t) => { lastDesktopXlsMtime = t; }, name: 'Escritorio' },
      { path: 'C:/Users/Gardenias/Downloads', lastTime: lastDownloadsXlsMtime, setTime: (t) => { lastDownloadsXlsMtime = t; }, name: 'Descargas' }
    ];

    for (const folder of checkFolders) {
      if (fs.existsSync(folder.path)) {
        try {
          const files = fs.readdirSync(folder.path).filter(f => (f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx')) && !f.startsWith('~$'));
          let maxMt = 0;
          for (const f of files) {
            const mt = fs.statSync(path.join(folder.path, f)).mtimeMs;
            if (mt > maxMt) maxMt = mt;
          }
          if (folder.lastTime && maxMt > folder.lastTime) {
            reason = `nuevo reporte Excel en ${folder.name}`;
            needsSync = true;
          }
          folder.setTime(maxMt);
        } catch (_) {}
      }
    }

    if (needsSync) {
      console.log(`[AutoSync] 🔄 Cambio detectado en Maxirest POS: ${reason}. Sincronizando...`);
      const syncRes = analytics.syncAll();
      const yFact = (syncRes && syncRes.yesterdayData && syncRes.yesterdayData.kpis) ? syncRes.yesterdayData.kpis.facturacionTotal : 0;
      console.log(`[AutoSync] ✅ Sincronización automática exitosa: Ayer ${syncRes.yesterday} ($${yFact.toLocaleString('es-AR')})`);
      io.emit('data_synced', {
        timestamp: Date.now(),
        reason,
        yesterday: syncRes.yesterday,
        yesterdayData: syncRes.yesterdayData
      });
      io.emit('staff_updated', { allStaff: analytics.getStaffRegistry() });
    }
  } catch (err) {
    console.error('[AutoSync] Error en ciclo de auto-sincronización:', err.message);
  }
}, 3000);

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
