/**
 * MaxiProtocol — Panel Ejecutivo de Toma de Decisiones
 * Integrado con Informes de Maxirest POS (Cliente #10783):
 * - Selector Multi-Día: Histórico auditado sin desfases
 * - Rendimiento Detallado por Producto & Pareto de Contribución
 * - Matriz de Productividad de Personal & Mozos con Monogramas
 * - Auditoría de Medios de Cobro, Comisiones de Pasarela & Liquidez
 * - Curva de Facturación Horaria & Participación por Rubro
 */

// Estado global de la aplicación
const AppState = {
  socket: null,
  activeSector: 'ALL',
  selectedMesa: null,
  soundEnabled: true,
  currentMode: 'MAXIREST_LOCAL',
  todayDate: null,
  yesterdayDate: null,
  selectedDate: null,
  availableDays: [],
  currentDayData: null,
  lastSnapshot: null,
  productSearchTerm: '',
  productCategoryFilter: 'ALL',
  mozoSearchTerm: '',
  mozoSortBy: 'ventas',
  mozoStatusFilter: 'ACTIVO',
  currentMozos: [],
  scopeMode: 'day',
  rangePreset: 'quarter',
  rangeFrom: '2026-07-01',
  rangeTo: '2026-09-30',
  rangeData: null,
  rangeDishSort: 'unidades',
  rangeDishSearch: '',
  rangeDishRubroFilter: 'ALL',
  rangeSubtab: 'range-subtab-platos',
  rangeSelectedCategory: 'ALL',
  rangeSelectedStrategy: 'ALL',
  rangeCategorySearch: '',
  charts: {
    rubros: null,
    pagos: null,
    horarios: null,
    rubrosOverview: null,
    rangeRubros: null,
    rangeHorarios: null,
    rangeDias: null
  }
};

function isTodayDate(dateKey) {
  if (!dateKey) return false;
  return dateKey === AppState.todayDate || dateKey === 'hoy' || dateKey === 'today';
}

function isYesterdayDate(dateKey) {
  if (!dateKey) return false;
  return dateKey === AppState.yesterdayDate || dateKey === 'ayer' || dateKey === 'yesterday';
}

// ==========================================================================
// 1. INICIALIZACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAudio();
  initSocket();
  initUIEvents();
  initDaySelector();
  initViewSwitcher();
  initRangeModule();
  initProductFilters();
  initMozoControls();
  initSyncButtons();
  initExportStakeholders();
});

function initClock() {
  const clockEl = document.getElementById('clock-display');
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('es-AR');
  }, 1000);
}

// ==========================================================================
// 2. SOCKET STREAMING & CONECTIVIDAD
// ==========================================================================

function initSocket() {
  const socket = io();
  AppState.socket = socket;

  socket.on('connect', () => {
    console.log('[MaxiProtocol] Conectado al servidor de streaming.');
    updateConnectionStatus(true, '<8ms');
  });

  socket.on('disconnect', () => {
    console.warn('[MaxiProtocol] Desconectado del servidor.');
    updateConnectionStatus(false, 'Desconectado');
  });

  socket.on('initial_state', (data) => {
    AppState.currentMode = data.mode;
    if (data.snapshot && isTodayDate(AppState.selectedDate)) {
      renderTables(data.snapshot.mesas);
      renderComandas(data.snapshot.comandasEnVivo);
    }
  });

  socket.on('tick_update', (snapshot) => {
    AppState.lastSnapshot = snapshot;
    if (isTodayDate(AppState.selectedDate)) {
      renderTables(snapshot.mesas);
      renderComandas(snapshot.comandasEnVivo);
      if (snapshot.metricas && snapshot.metricas.facturacionHoy > 0) {
        const kpiFact = document.getElementById('kpi-facturacion');
        if (kpiFact) kpiFact.textContent = Number(snapshot.metricas.facturacionHoy).toLocaleString('es-AR');
        const kpiTicks = document.getElementById('kpi-tickets-count');
        if (kpiTicks) kpiTicks.textContent = `${snapshot.metricas.totalTickets || 0} comprobantes emitidos`;
      }
    }
  });

  socket.on('staff_updated', () => {
    console.log('[MaxiProtocol] Personal actualizado vía Socket.IO. Recargando analíticas...');
    loadDayData(AppState.selectedDate);
  });

  socket.on('data_synced', async (payload) => {
    console.log('[MaxiProtocol] Datos contables sincronizados vía Socket.IO:', payload);
    if (payload && payload.yesterdayData && payload.yesterdayData.kpis && payload.yesterdayData.kpis.facturacionTotal > 0) {
      const factStr = `$${(payload.yesterdayData.kpis.facturacionTotal / 1000000).toFixed(2)}M`;
      showToast(`🔄 Maxirest POS: Cierre detectado para Ayer ${payload.yesterday} (${factStr})`, 'info');
    }
    await initDaySelector(AppState.selectedDate);
    loadDayData(AppState.selectedDate);
  });
}

function initSyncButtons() {
  const btnAll = document.getElementById('btn-sync-all');
  const btnMozos = document.getElementById('btn-sync-mozos');

  if (btnAll) {
    btnAll.addEventListener('click', async () => {
      btnAll.disabled = true;
      const icon = btnAll.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      showToast('Sincronizando con Maxirest POS...', 'info');
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          const yFact = data.yesterdayFacturacion || 0;
          const factStr = yFact > 0 ? `$${(yFact / 1000000).toFixed(2)}M` : '$0';
          showToast(`✅ Sincronizado con éxito: Ayer ${data.yesterday} (${factStr}, ${data.yesterdayTickets || 0} tickets)`, 'success');
          
          // Si el día de ayer tiene facturación consolidada, activar ayer para que el usuario vea el balance de inmediato
          const dateToLoad = (yFact > 0 && data.yesterday) ? data.yesterday : (AppState.selectedDate || data.yesterday);
          await initDaySelector(dateToLoad);
          selectAndActivateDate(dateToLoad);
        } else {
          showToast('Error sincronizando: ' + (data.error || 'Desconocido'), 'error');
        }
      } catch (err) {
        console.error('[MaxiProtocol] Error de sincronización:', err);
        showToast('Error de conexión al sincronizar con Maxirest POS', 'error');
      } finally {
        btnAll.disabled = false;
        if (icon) icon.classList.remove('fa-spin');
      }
    });
  }

  if (btnMozos) {
    btnMozos.addEventListener('click', async () => {
      btnMozos.disabled = true;
      const icon = btnMozos.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      showToast(`Sincronizando informe de mozos para ${AppState.selectedDate}...`, 'info');
      try {
        const res = await fetch('/api/mozos/sync-maxirest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: AppState.selectedDate })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Sincronización completada desde Maxirest POS (${data.mozos.filter(m => m.ventas > 0).length} mozos con ventas en turno).`, 'success');
          await initDaySelector();
          loadDayData(AppState.selectedDate);
        } else {
          showToast('Error sincronizando mozos: ' + (data.error || 'Desconocido'), 'error');
        }
      } catch (err) {
        console.error('[MaxiProtocol] Error sincronizando mozos:', err);
        showToast('Error de conexión al sincronizar mozos con Maxirest POS', 'error');
      } finally {
        btnMozos.disabled = false;
        if (icon) icon.classList.remove('fa-spin');
      }
    });
  }
}

function updateConnectionStatus(connected, latency) {
  const chipPing = document.getElementById('chip-ping');
  const txtLatency = document.getElementById('txt-latency');
  if (connected) {
    txtLatency.textContent = `Latencia: ${latency}`;
  } else {
    txtLatency.textContent = 'Sin conexión';
  }
}

// ==========================================================================
// 3. SELECTOR MULTI-DÍA Y CARGA DE DATOS DINÁMICA
// ==========================================================================

async function initDaySelector(targetDateOverride) {
  const customDateInput = document.getElementById('input-custom-date');
  const urlParams = new URLSearchParams(window.location.search);
  const paramDate = targetDateOverride || urlParams.get('date');

  try {
    const res = await fetch('/api/analytics/days');
    const json = await res.json();
    if (json.success && json.days) {
      AppState.availableDays = json.days;
      AppState.todayDate = json.today;
      AppState.yesterdayDate = json.yesterday;
      AppState.latestClosedDay = json.latestClosedDay || '2026-10-14';

      let targetDate = paramDate;
      if (!targetDate) {
        // Regla de Alta Disponibilidad & Resiliencia Continua:
        // Si ayer tiene arqueo emitido en Maxirest POS y facturación > 0, cargar ayer.
        // Si ayer aún está pendiente de cierre contable en el POS, cargar automáticamente
        // el último día cerrado con auditoría completa (latestClosedDay, ej. 2026-10-14),
        // garantizando que el usuario SIEMPRE vea métricas y gráficos útiles y verídicos de inmediato.
        const yesterdayObj = json.days.find(d => d.id === json.yesterday);
        if (yesterdayObj && !yesterdayObj.pendingClosure && yesterdayObj.facturacion > 0) {
          targetDate = json.yesterday;
        } else if (json.latestClosedDay) {
          targetDate = json.latestClosedDay;
        } else {
          targetDate = json.yesterday || json.today;
        }
      }
      AppState.selectedDate = targetDate;

      renderDayPills(json.days, targetDate);

      if (customDateInput) {
        customDateInput.value = targetDate;
      }

      loadDayData(targetDate);
    }
  } catch (e) {
    console.error('[MaxiProtocol] Error cargando lista de días:', e);
    const fallbackDate = paramDate || '2026-10-14';
    AppState.selectedDate = fallbackDate;
    loadDayData(fallbackDate);
  }

  if (customDateInput) {
    customDateInput.addEventListener('change', (e) => {
      if (e.target.value && e.target.value.length === 10) {
        selectAndActivateDate(e.target.value);
      }
    });
  }
}

function renderDayPills(days, activeDate) {
  const container = document.getElementById('day-pills-container');
  if (!container) return;

  container.innerHTML = '';

  const displayDays = [...days];
  const exists = displayDays.some(d => d.id === activeDate);
  if (!exists && activeDate && /^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
    const parts = activeDate.split('-');
    const curData = AppState.currentDayData && AppState.currentDayData.fecha === activeDate ? AppState.currentDayData : null;
    displayDays.unshift({
      id: activeDate,
      label: `${parts[2]}/${parts[1]}/${parts[0]}`,
      tag: 'Auditado',
      facturacion: curData && curData.kpis ? curData.kpis.facturacionTotal : 0,
      cubiertos: curData && curData.kpis ? curData.kpis.totalComensales : 0
    });
  }

  displayDays.forEach(day => {
    const btn = document.createElement('button');
    const isAct = day.id === activeDate;
    const isPend = !!day.pendingClosure;
    const isLatest = !!day.isLatestClosed;
    btn.className = `day-pill-btn ${isAct ? 'active' : ''} ${isPend ? 'day-pill-pending' : ''} ${isLatest ? 'day-pill-latest' : ''}`;
    btn.dataset.date = day.id;

    let badgeText = '';
    let cubiertosHtml = '';

    if (day.isToday) {
      badgeText = 'En vivo';
      cubiertosHtml = `<span class="day-pill-cubiertos"><i class="fa-solid fa-users"></i> ${day.cubiertos || 0} Cub</span>`;
    } else if (isPend) {
      badgeText = '⏳ Pendiente Cierre';
      cubiertosHtml = `<span class="day-pill-cubiertos pending-tag"><i class="fa-solid fa-clock"></i> Sin arqueo</span>`;
    } else if (day.facturacion > 0) {
      badgeText = `$${(day.facturacion / 1000000).toFixed(2)}M`;
      cubiertosHtml = `<span class="day-pill-cubiertos"><i class="fa-solid fa-users"></i> ${day.cubiertos || 0} Cub</span>`;
    } else {
      badgeText = day.tag || 'Cierre';
      if (day.cubiertos) {
        cubiertosHtml = `<span class="day-pill-cubiertos"><i class="fa-solid fa-users"></i> ${day.cubiertos} Cub</span>`;
      }
    }

    btn.innerHTML = `
      <span class="pill-title">${day.label}</span>
      <span class="day-pill-badge">${badgeText}</span>
      ${cubiertosHtml}
    `;

    btn.addEventListener('click', () => {
      selectAndActivateDate(day.id);
    });

    container.appendChild(btn);
  });
}

function selectAndActivateDate(targetDate) {
  AppState.selectedDate = targetDate;

  const container = document.getElementById('day-pills-container');
  if (container) {
    let matched = false;
    container.querySelectorAll('.day-pill-btn').forEach(b => {
      if (b.dataset.date === targetDate) {
        b.classList.add('active');
        matched = true;
      } else {
        b.classList.remove('active');
      }
    });
    if (!matched && AppState.availableDays.length > 0) {
      renderDayPills(AppState.availableDays, targetDate);
    }
  }

  const customDateInput = document.getElementById('input-custom-date');
  if (customDateInput && customDateInput.value !== targetDate) {
    customDateInput.value = targetDate;
  }

  const newUrl = `${window.location.pathname}?date=${targetDate}`;
  window.history.pushState({ path: newUrl }, '', newUrl);

  loadDayData(targetDate);
}

async function loadDayData(dateKey) {
  try {
    const res = await fetch(`/api/analytics/day?date=${encodeURIComponent(dateKey)}`);
    const json = await res.json();

    if (json.success && json.data) {
      AppState.currentDayData = json.data;
      if (json.today) AppState.todayDate = json.today;
      if (json.yesterday) AppState.yesterdayDate = json.yesterday;
      if (json.latestClosedDay) AppState.latestClosedDay = json.latestClosedDay;

      renderDayAnalytics(json.data);
      showToast(`Auditando período: ${json.data.nombreDia}`, 'info');

      // Actualizar la píldora activa con los datos reales consolidados
      const activeBtn = document.querySelector(`.day-pill-btn[data-date="${json.data.fecha}"]`);
      if (activeBtn) {
        const badge = activeBtn.querySelector('.day-pill-badge');
        let cubSpan = activeBtn.querySelector('.day-pill-cubiertos');
        if (json.data.kpis && json.data.kpis.facturacionTotal > 0) {
          if (badge) badge.textContent = `$${(json.data.kpis.facturacionTotal / 1000000).toFixed(2)}M`;
          if (!cubSpan) {
            cubSpan = document.createElement('span');
            cubSpan.className = 'day-pill-cubiertos';
            activeBtn.appendChild(cubSpan);
          }
          cubSpan.innerHTML = `<i class="fa-solid fa-users"></i> ${json.data.kpis.totalComensales || 0} Cub`;
        } else if (json.data.pendingClosure) {
          if (badge) badge.textContent = '⏳ Pendiente';
          if (!cubSpan) {
            cubSpan = document.createElement('span');
            cubSpan.className = 'day-pill-cubiertos pending-tag';
            activeBtn.appendChild(cubSpan);
          }
          cubSpan.innerHTML = '<i class="fa-solid fa-clock"></i> Sin arqueo';
        } else {
          const isHoliday = json.data.archivoOrigen && json.data.archivoOrigen.toLowerCase().includes('feriado');
          if (badge) badge.textContent = isHoliday ? 'Feriado' : 'Cerrado';
          if (cubSpan) cubSpan.remove();
        }
      }

      // Si seleccionó HOY, refrescar snapshot en vivo de salón y comandas
      if (isTodayDate(json.data.fecha)) {
        fetch('/api/snapshot')
          .then(r => r.json())
          .then(snap => {
            if (snap.mesas) renderTables(snap.mesas);
            if (snap.comandasEnVivo) renderComandas(snap.comandasEnVivo);
          })
          .catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error cargando analítica:', err);
    showToast('Error cargando datos: ' + err.message, 'error');
  }
}

function renderPendingClosureBanner(dayData) {
  const container = document.getElementById('pending-closure-banner-container');
  if (!container) return;

  if (!dayData || !dayData.pendingClosure) {
    container.innerHTML = '';
    return;
  }

  const latestDay = dayData.latestClosedDay || AppState.latestClosedDay || '2026-10-14';
  const parts = latestDay.split('-');
  const latestFormatted = `${parts[2]}/${parts[1]}`;

  container.innerHTML = `
    <div class="pending-closure-banner animate-fade-in">
      <div class="pc-banner-icon">
        <i class="fa-solid fa-clock-rotate-left"></i>
      </div>
      <div class="pc-banner-content">
        <div class="pc-banner-header">
          <span class="pc-badge"><i class="fa-solid fa-triangle-exclamation"></i> Maxirest POS — Turno Pendiente de Arqueo</span>
          <span class="pc-date-tag">${dayData.nombreDia}</span>
        </div>
        <h3 class="pc-banner-title">El cierre contable de este turno aún no ha sido emitido en el Punto de Venta</h3>
        <p class="pc-banner-desc">
          En la terminal de caja Maxirest POS no se ha generado todavía el informe de arqueo / cierre (<code>bakinforme.dbf</code>). 
          Para mantener fidelidad 1:1 estricta de auditoría (sin inventar ni aproximar cifras), este turno se consolidará en cuanto la caja emita el informe.
        </p>
        <div class="pc-banner-actions">
          <button type="button" class="btn-pc-latest" id="btn-banner-go-latest">
            <i class="fa-solid fa-calendar-check"></i> Ver Último Cierre Auditado (${latestFormatted})
          </button>
          <button type="button" class="btn-pc-sync" id="btn-banner-sync-pos">
            <i class="fa-solid fa-rotate"></i> Re-escanear Maxirest POS
          </button>
        </div>
      </div>
    </div>
  `;

  const btnLatest = document.getElementById('btn-banner-go-latest');
  if (btnLatest) {
    btnLatest.addEventListener('click', () => {
      selectAndActivateDate(latestDay);
    });
  }

  const btnSync = document.getElementById('btn-banner-sync-pos');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Escaneando POS...';
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('Sincronización completada con Maxirest POS', 'success');
          await initDaySelector();
          loadDayData(AppState.selectedDate);
        } else {
          showToast('Aún no se ha emitido el arqueo en Maxirest POS', 'info');
        }
      } catch (e) {
        showToast('Error de conexión con Maxirest POS', 'error');
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = '<i class="fa-solid fa-rotate"></i> Re-escanear Maxirest POS';
      }
    });
  }
}

function renderDayAnalytics(dayData) {
  if (!dayData) return;

  renderPendingClosureBanner(dayData);

  const kpis = dayData.kpis || {};

  // 1. C-Level KPI Cards
  const lblFact = document.getElementById('lbl-facturacion-card');
  if (lblFact) {
    let periodName = '';
    if (isTodayDate(dayData.fecha)) periodName = 'Hoy (En Vivo)';
    else if (isYesterdayDate(dayData.fecha)) periodName = 'Ayer';
    else periodName = dayData.fecha.split('-').reverse().slice(0, 2).join('/');
    lblFact.textContent = `Facturación Neta (${periodName})`;
  }
  
  document.getElementById('kpi-facturacion').textContent = Number(kpis.facturacionTotal || 0).toLocaleString('es-AR');
  document.getElementById('kpi-tickets-count').textContent = `${kpis.totalTickets || 0} comprobantes emitidos`;
  
  const trendPill = document.getElementById('kpi-trend-pill');
  if (trendPill) {
    if (dayData.pendingClosure) {
      trendPill.className = 'metric-trend trend-warning';
      trendPill.innerHTML = '<i class="fa-solid fa-clock"></i> Pendiente de Cierre';
    } else if (kpis.variacionVsAnterior && kpis.variacionVsAnterior !== 'N/A') {
      const isPos = kpis.variacionVsAnterior.startsWith('+');
      trendPill.className = `metric-trend ${isPos ? 'trend-positive' : 'trend-neutral'}`;
      trendPill.innerHTML = `<i class="fa-solid fa-arrow-trend-${isPos ? 'up' : 'down'}"></i> ${kpis.variacionVsAnterior} vs anterior`;
    } else {
      trendPill.className = 'metric-trend trend-neutral';
      trendPill.innerHTML = 'En curso';
    }
  }

  // Card 2: Cubiertos Atendidos
  const elCubiertos = document.getElementById('kpi-total-cubiertos');
  if (elCubiertos) elCubiertos.textContent = Number(kpis.totalComensales || 0).toLocaleString('es-AR');

  const elGastoCubierto = document.getElementById('kpi-comensal-avg');
  if (elGastoCubierto) elGastoCubierto.textContent = `$${Number(kpis.gastoPromedioComensal || 0).toLocaleString('es-AR')} / cubierto`;

  const elMesasRatio = document.getElementById('kpi-mesas-ratio');
  if (elMesasRatio) {
    if (kpis.canales && kpis.canales.salon) {
      elMesasRatio.textContent = `Salón: $${Number(kpis.canales.salon).toLocaleString('es-AR')}`;
    } else {
      elMesasRatio.textContent = `${kpis.mesasRotadas || 0} mesas rotadas`;
    }
  }

  // Card 3: Ticket Promedio por Mesa
  const elTicket = document.getElementById('kpi-ticket-promedio');
  if (elTicket) elTicket.textContent = Number(kpis.ticketPromedio || 0).toLocaleString('es-AR');

  const elTiempoMesa = document.getElementById('kpi-tiempo-mesa');
  if (elTiempoMesa) elTiempoMesa.textContent = `${kpis.tiempoPromedioMesaMin || 0} min permanencia media`;

  const elHoraPico = document.getElementById('kpi-hora-pico');
  if (elHoraPico) elHoraPico.textContent = kpis.horaPico ? kpis.horaPico.split('(')[0].trim() : 'Turno Normal';

  // Card 4: Origen y Fecha
  const elOrigen = document.getElementById('kpi-origen-file');
  const elOrigenUnit = elOrigen ? elOrigen.nextElementSibling : null;
  const elStatusBadge = document.getElementById('kpi-status-badge');
  const elFecha = document.getElementById('kpi-fecha-full');

  if (elFecha) elFecha.textContent = dayData.nombreDia;

  const isClosedDay = !kpis.facturacionTotal || kpis.facturacionTotal === 0;
  const isHoliday = dayData.archivoOrigen && dayData.archivoOrigen.toLowerCase().includes('feriado');
  const isPending = !!dayData.pendingClosure;

  if (isPending) {
    if (elOrigen) elOrigen.textContent = 'Pendiente';
    if (elOrigenUnit) elOrigenUnit.textContent = 'Maxirest POS';
    if (elStatusBadge) {
      elStatusBadge.className = 'metric-trend trend-warning';
      elStatusBadge.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Pendiente de Cierre';
    }
  } else if (isClosedDay) {
    if (elOrigen) elOrigen.textContent = isHoliday ? 'Año Nuevo' : 'Sin Ventas';
    if (elOrigenUnit) elOrigenUnit.textContent = isHoliday ? 'Feriado Nacional' : 'Local Cerrado';
    if (elStatusBadge) {
      elStatusBadge.className = 'metric-trend trend-neutral';
      elStatusBadge.innerHTML = `<i class="fa-solid fa-door-closed"></i> ${isHoliday ? 'Local Cerrado' : 'Sin operaciones'}`;
    }
  } else {
    let fileName = 'Maxirest DBF';
    if (dayData.archivoOrigen) {
      const m = dayData.archivoOrigen.match(/([a-zA-Z0-9_-]+\.dbf)/i);
      if (m) {
        fileName = m[1].toUpperCase();
      } else {
        fileName = dayData.archivoOrigen.split(' ')[0];
      }
    }
    if (elOrigen) elOrigen.textContent = fileName;
    if (elOrigenUnit) elOrigenUnit.textContent = 'Maxirest DBF';
    if (elStatusBadge) {
      elStatusBadge.className = 'metric-trend trend-verified';
      elStatusBadge.innerHTML = '<i class="fa-solid fa-check"></i> Verificado 100%';
    }
  }

  // 2. Medios de Cobro & Flujo de Fondos
  renderMediosPagoCards(dayData.mediosPago, kpis.facturacionTotal);

  // 3. Gráficos Ejecutivos
  renderChartHorarios(dayData.distribucionHoraria);
  renderChartRubrosOverview(dayData.ventasPorRubro);

  // 4. Tabla de Rendimiento por Producto
  renderProductsTable(dayData.productosTop);

  // 5. Grid Ejecutiva de Mozos
  renderMozosExecutive(dayData.mozos);
}

// ==========================================================================
// 4. MEDIOS DE COBRO & ANÁLISIS FINANCIERO (COMISIONES Y LIQUIDEZ)
// ==========================================================================

function renderMediosPagoCards(medios, totalFacturado) {
  const container = document.getElementById('medios-pago-cards-container');
  if (!container) return;

  container.innerHTML = '';
  const entries = Object.entries(medios || {});
  
  if (entries.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
        Sin cobros registrados aún para este período.
      </div>
    `;
    return;
  }

  // Deducciones bancarias y de pasarelas basadas en liquidaciones oficiales reales (extracto NAVE)
  const feeMap = {
    'NAVE (Tarjetas)': {
      items: [
        { label: 'Costos por cobro (2.63%):', rate: 0.02633 },
        { label: 'Impuestos asociados (2.55%):', rate: 0.02553 }
      ],
      netLabel: 'Neto a cuenta (94.81%):'
    },
    'Mercado Pago': {
      items: [
        { label: 'Arancel QR MP (0.8%):', rate: 0.008 }
      ],
      netLabel: 'Neto estimado a cuenta:'
    },
    'PedidosYa': {
      items: [
        { label: 'Comisión Delivery (15.0%):', rate: 0.150 }
      ],
      netLabel: 'Neto estimado liquidación:'
    },
    'Efectivo': {
      items: [
        { label: 'Comisión (0% / 100% Líquido):', rate: 0.0, zeroLabel: '$0' }
      ],
      netLabel: 'Neto directo en caja:'
    },
    'Banco / Transf.': {
      items: [
        { label: 'Transferencia Directa (0%):', rate: 0.0, zeroLabel: '$0' }
      ],
      netLabel: 'Neto en cuenta bancaria:'
    },
    'Clover / POS': {
      items: [
        { label: 'Arancel POS (1.8%):', rate: 0.018 }
      ],
      netLabel: 'Neto estimado a caja:'
    },
    'Cta. Cte. / Varios': {
      items: [
        { label: 'Cuenta Corriente (A cobrar):', rate: 0.0, zeroLabel: '$0' }
      ],
      netLabel: 'Saldo pendiente de cobro:'
    }
  };

  entries.forEach(([nombre, data]) => {
    const feeConfig = feeMap[nombre] || {
      items: [{ label: 'Comisión Estimada (1.5%):', rate: 0.015 }],
      netLabel: 'Neto estimado a caja:'
    };

    let totalDeductions = 0;
    const deductionRowsHtml = feeConfig.items.map(item => {
      const amount = Math.round(data.importe * item.rate);
      totalDeductions += amount;
      const displayVal = amount > 0 ? `-$${Number(amount).toLocaleString('es-AR')}` : (item.zeroLabel || '$0');
      return `
        <div class="payment-metric-row">
          <span>${item.label}</span>
          <span class="payment-commission-val" style="${amount === 0 ? 'color: var(--accent-emerald);' : ''}">${displayVal}</span>
        </div>
      `;
    }).join('');

    const netAmount = data.importe - totalDeductions;
    const avgTicket = data.tickets > 0 ? Math.round(data.importe / data.tickets) : 0;

    const card = document.createElement('div');
    card.className = 'payment-card';
    card.innerHTML = `
      <div class="payment-card-header">
        <div class="payment-channel-name">
          <i class="fa-solid ${data.icon || 'fa-credit-card'} payment-channel-icon"></i>
          <span>${nombre}</span>
        </div>
        <span class="payment-share-badge">${data.porcentaje}% del total</span>
      </div>

      <div class="payment-amount-row">
        <span class="currency-symbol">$</span>
        <span class="payment-amount">${Number(data.importe).toLocaleString('es-AR')}</span>
      </div>

      <div class="payment-metrics-table">
        <div class="payment-metric-row">
          <span>Comprobantes cobrados:</span>
          <strong>${data.tickets} tickets</strong>
        </div>
        <div class="payment-metric-row">
          <span>Ticket promedio en canal:</span>
          <strong>$${Number(avgTicket).toLocaleString('es-AR')}</strong>
        </div>
        ${deductionRowsHtml}
        <div class="payment-metric-row" style="padding-top: 4px; border-top: 1px dashed var(--border-subtle); color: var(--text-secondary);">
          <span style="font-weight: 600;">${feeConfig.netLabel}</span>
          <strong style="color: var(--accent-emerald); font-size: 13px;">$${Number(netAmount).toLocaleString('es-AR')}</strong>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// 5. INGENIERÍA DE MENÚ & RENDIMIENTO POR ARTÍCULO
// ==========================================================================

function initProductFilters() {
  const searchInput = document.getElementById('search-product-input');
  const catSelect = document.getElementById('select-category-filter');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.productSearchTerm = e.target.value.toLowerCase().trim();
      if (AppState.currentDayData) {
        renderProductsTable(AppState.currentDayData.productosTop);
      }
    });
  }

  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      AppState.productCategoryFilter = e.target.value;
      if (AppState.currentDayData) {
        renderProductsTable(AppState.currentDayData.productosTop);
      }
    });
  }
}

function renderProductsTable(productos) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  let list = productos || [];

  if (AppState.productSearchTerm) {
    list = list.filter(p => 
      p.nombre.toLowerCase().includes(AppState.productSearchTerm) ||
      p.codigo.toLowerCase().includes(AppState.productSearchTerm) ||
      p.rubro.toLowerCase().includes(AppState.productSearchTerm)
    );
  }

  if (AppState.productCategoryFilter !== 'ALL') {
    list = list.filter(p => p.rubro.toLowerCase().includes(AppState.productCategoryFilter.toLowerCase()));
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
          No se encontraron artículos para el filtro seleccionado.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
      <td><span class="product-code-badge">#${p.codigo}</span></td>
      <td class="product-name-cell">${p.nombre}</td>
      <td><span class="product-category-chip">${p.rubro}</span></td>
      <td style="text-align: right; font-weight: 700; color: var(--text-primary);">${p.unidades}</td>
      <td style="text-align: right; color: var(--text-muted);">$${Number(p.unitario).toLocaleString('es-AR')}</td>
      <td style="text-align: right; font-weight: 700; color: var(--accent-emerald);">$${Number(p.facturado).toLocaleString('es-AR')}</td>
      <td>
        <div class="progress-share-wrap">
          <div class="progress-share-bar">
            <div class="progress-share-fill" style="width: ${Math.min(100, p.porcentaje * 5)}%;"></div>
          </div>
          <span style="font-size: 12px; font-weight: 700; color: var(--accent-primary); min-width: 38px; text-align: right;">${p.porcentaje}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// 6. MATRIZ DE PRODUCTIVIDAD Y PERSONAL (MOZOS)
// ==========================================================================

function initMozoControls() {
  const searchInput = document.getElementById('search-mozo-input');
  const sortSelect = document.getElementById('select-mozo-sort');
  const filterGroup = document.getElementById('mozo-status-filter-group');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.mozoSearchTerm = e.target.value.toLowerCase().trim();
      renderMozosExecutive(AppState.currentMozos);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.mozoSortBy = e.target.value;
      renderMozosExecutive(AppState.currentMozos);
    });
  }

  if (filterGroup) {
    filterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.mozo-pill-filter');
      if (!btn) return;
      filterGroup.querySelectorAll('.mozo-pill-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.mozoStatusFilter = btn.dataset.status || 'ACTIVO';
      renderMozosExecutive(AppState.currentMozos);
    });
  }

  // Configuración de modal de edición de mozo
  const modal = document.getElementById('modal-staff-edit');
  const btnClose = document.getElementById('btn-close-staff-modal');
  const btnCancel = document.getElementById('btn-cancel-staff-edit');
  const form = document.getElementById('form-staff-edit');

  if (btnClose) btnClose.addEventListener('click', window.closeStaffModal);
  if (btnCancel) btnCancel.addEventListener('click', window.closeStaffModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal-staff-edit') window.closeStaffModal();
    });
  }

  // Botón "Hoy" para fecha de egreso/baja rápida
  const btnBajaHoy = document.getElementById('btn-staff-baja-hoy');
  if (btnBajaHoy) {
    btnBajaHoy.addEventListener('click', () => {
      const todayStr = (AppState.calendarDates && AppState.calendarDates.today) 
        ? AppState.calendarDates.today 
        : new Date().toISOString().split('T')[0];
      const egrInput = document.getElementById('staff-edit-egreso');
      const estInput = document.getElementById('staff-edit-estado');
      if (egrInput) egrInput.value = todayStr;
      if (estInput) estInput.value = 'BAJA';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('staff-edit-id').value;
      const nombre = document.getElementById('staff-edit-nombre').value.trim();
      const estado = document.getElementById('staff-edit-estado').value;
      const fechaIngreso = document.getElementById('staff-edit-ingreso').value || null;
      const fechaEgreso = document.getElementById('staff-edit-egreso').value || null;
      const periodoActividad = document.getElementById('staff-edit-periodo').value || null;
      const platoMasVendido = document.getElementById('staff-edit-plato').value || null;
      const postreMasVendido = document.getElementById('staff-edit-postre').value || null;
      const observaciones = document.getElementById('staff-edit-observaciones').value || null;

      try {
        const res = await fetch('/api/staff/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            nombre,
            estado,
            fechaIngreso,
            fechaEgreso,
            periodoActividad,
            platoMasVendido,
            postreMasVendido,
            observaciones
          })
        });
        const data = await res.json();
        if (data.success) {
          window.closeStaffModal();
          showToast(`Ficha de ${data.staff.nombre} actualizada correctamente`, 'success');
          loadDayData(AppState.selectedDate);
        } else {
          showToast('Error al actualizar personal: ' + (data.error || 'Desconocido'), 'error');
        }
      } catch (err) {
        console.error('[MaxiProtocol] Error actualizando personal:', err);
        showToast('Error de comunicación con el servidor', 'error');
      }
    });
  }
}

// Formateador de fecha legible (DD/MM/YYYY)
function formatHireDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Generador de iniciales / monograma profesional
function getMonogram(nombre) {
  if (!nombre) return 'MZ';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

// Modal helper functions
window.openStaffModal = function(staffId) {
  const list = AppState.currentMozos || [];
  const staff = list.find(s => s.id == staffId);
  if (!staff) {
    fetch('/api/staff')
      .then(r => r.json())
      .then(d => {
        const found = (d.staff || []).find(s => s.id == staffId);
        if (found) populateStaffModal(found);
      })
      .catch(err => console.error('[MaxiProtocol] Error cargando staff:', err));
    return;
  }
  populateStaffModal(staff);
};

function populateStaffModal(staff) {
  const idEl = document.getElementById('staff-edit-id');
  const nomEl = document.getElementById('staff-edit-nombre');
  const codEl = document.getElementById('staff-edit-codigo');
  const estEl = document.getElementById('staff-edit-estado');
  const ingEl = document.getElementById('staff-edit-ingreso');
  const egrEl = document.getElementById('staff-edit-egreso');
  const perEl = document.getElementById('staff-edit-periodo');
  const plaEl = document.getElementById('staff-edit-plato');
  const posEl = document.getElementById('staff-edit-postre');
  const obsEl = document.getElementById('staff-edit-observaciones');

  if (idEl) idEl.value = staff.id;
  if (nomEl) nomEl.value = staff.nombre || '';
  if (codEl) codEl.value = staff.codigo ? `#${staff.codigo}` : '';
  if (estEl) estEl.value = staff.estado || 'ACTIVO';
  if (ingEl) ingEl.value = staff.fechaIngreso || '';
  if (egrEl) egrEl.value = staff.fechaEgreso || '';
  if (perEl) perEl.value = staff.periodoActividad || '';

  let platoClean = staff.platoMasVendido || '';
  platoClean = platoClean.replace(/\s*\(\d+\s*u\.\)/, '');
  if (plaEl) plaEl.value = platoClean;

  let postreClean = (staff.postres && staff.postres.postreTop && staff.postres.postreTop !== '-') 
    ? staff.postres.postreTop 
    : (staff.postreMasVendido || '');
  if (posEl) posEl.value = postreClean;

  if (obsEl) obsEl.value = staff.observaciones || '';

  const badge = document.getElementById('modal-staff-badge');
  if (badge) {
    badge.textContent = staff.estado === 'BAJA' ? 'Dado de Baja' : 'Activo en Plantilla';
    badge.className = `badge-status ${staff.estado === 'BAJA' ? 'badge-baja' : 'badge-active'}`;
  }

  const modal = document.getElementById('modal-staff-edit');
  if (modal) {
    modal.style.display = 'flex';
    // Si no tiene fecha de ingreso asignada, enfocar el campo de fecha de ingreso automáticamente
    if (!staff.fechaIngreso && ingEl) {
      setTimeout(() => ingEl.focus(), 120);
    }
  }
}

window.closeStaffModal = function() {
  const modal = document.getElementById('modal-staff-edit');
  if (modal) modal.style.display = 'none';
};

window.quickToggleStaffStatus = async function(staffId) {
  try {
    const res = await fetch('/api/staff/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, dateKey: AppState.selectedDate })
    });
    const data = await res.json();
    if (data.success) {
      const newStatus = data.staff.estado === 'BAJA' ? 'Dado de baja' : 'Reactivado en plantilla activa';
      showToast(`${data.staff.nombre} ahora está: ${newStatus}`, 'info');
      loadDayData(AppState.selectedDate);
    } else {
      showToast('Error al alternar estado del personal', 'error');
    }
  } catch (err) {
    console.error('[MaxiProtocol] Error alternando estado de personal:', err);
    showToast('Error de comunicación con el servidor', 'error');
  }
};

function formatShiftDuration(start, end) {
  if (!start || !end || start === end) return '';
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin < 0) diffMin += 24 * 60;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function renderMozosExecutive(mozos) {
  const container = document.getElementById('mozos-cards-container');
  if (!container) return;

  if (mozos) AppState.currentMozos = mozos;
  const list = AppState.currentMozos || [];
  const term = AppState.mozoSearchTerm || '';
  const sortBy = AppState.mozoSortBy || 'ventas';
  const statusFilter = AppState.mozoStatusFilter || 'ACTIVO';

  let filtered = list.filter(m => {
    // 1. Filtro por Estado de Rotación
    if (statusFilter === 'ACTIVO') {
      if (m.estado === 'BAJA') return false;
    } else if (statusFilter === 'BAJA') {
      if (m.estado !== 'BAJA') return false;
    }

    // 2. Filtro por Término de Búsqueda
    if (!term) return true;
    const matchName = (m.nombre || '').toLowerCase().includes(term);
    const matchCode = String(m.codigo || '').includes(term);
    const matchPlato = (m.platoMasVendido || '').toLowerCase().includes(term);
    const matchPeriod = (m.periodoActividad || '').toLowerCase().includes(term);
    const matchPostre = (m.postres && m.postres.postreTop ? m.postres.postreTop : '').toLowerCase().includes(term);
    return matchName || matchCode || matchPlato || matchPeriod || matchPostre;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'tickets') return (b.tickets || 0) - (a.tickets || 0);
    if (sortBy === 'promedio') return (b.ticketPromedio || 0) - (a.ticketPromedio || 0);
    if (sortBy === 'postres') {
      const aP = (a.postres && a.postres.unidades) ? a.postres.unidades : 0;
      const bP = (b.postres && b.postres.unidades) ? b.postres.unidades : 0;
      return bP - aP;
    }
    if (sortBy === 'ingreso') {
      const aDate = a.fechaIngreso || '0000-00-00';
      const bDate = b.fechaIngreso || '0000-00-00';
      return bDate.localeCompare(aDate);
    }
    return (b.ventas || 0) - (a.ventas || 0);
  });

  const badge = document.getElementById('mozos-count-badge');
  if (badge) {
    const activeWithSales = filtered.filter(m => (m.ventas || 0) > 0).length;
    let filterLabel = 'Activos';
    if (statusFilter === 'BAJA') filterLabel = 'Dados de Baja';
    if (statusFilter === 'ALL') filterLabel = 'Total Plantilla';
    if (activeWithSales > 0) {
      badge.textContent = `${activeWithSales} en Turno (${filtered.length} ${filterLabel})`;
    } else {
      badge.textContent = `${filtered.length} Miembros (${filterLabel}${term ? ' - Filtrados' : ''})`;
    }
  }

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: var(--text-muted); background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <i class="fa-solid fa-user-clock" style="font-size: 24px; margin-bottom: 8px; color: var(--text-muted);"></i>
        <div>No se encontraron mozos para el filtro seleccionado ("${statusFilter === 'BAJA' ? 'Dados de Baja' : statusFilter === 'ACTIVO' ? 'Solo Activos' : 'Todos'}"${term ? ` con búsqueda "${term}"` : ''}).</div>
      </div>
    `;
    renderMozosMiniList([]);
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement('div');
    const isBaja = m.estado === 'BAJA';
    const hasSales = (m.ventas || 0) > 0;
    card.className = `mozo-executive-card ${isBaja ? 'is-baja' : ''} ${!hasSales ? 'is-idle' : ''}`;
    card.setAttribute('onclick', `window.openMozoBreakdownModal('${m.nombre.replace(/'/g, "\\'")}', ${m.id || m.codigo})`);
    card.setAttribute('title', 'Click para ver desglose auditado de categorías y platos');
    const monogram = getMonogram(m.nombre);
    const postresUnits = (m.postres && m.postres.unidades) ? m.postres.unidades : 0;
    const postresFact = (m.postres && m.postres.facturado) ? m.postres.facturado : 0;
    const postreName = (m.postres && m.postres.postreTop && m.postres.postreTop !== '-') ? m.postres.postreTop : (m.postreMasVendido || 'Torta Cheese Pistacho');

    card.innerHTML = `
      <div class="mozo-card-top">
        <div class="mozo-monogram">${monogram}</div>
        <div class="mozo-info-block">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <h4 class="mozo-name-title">${m.nombre}</h4>
            <span class="mozo-badge-pill ${isBaja ? 'badge-baja' : (hasSales ? 'badge-active' : 'badge-idle')}">
              <i class="fa-solid ${isBaja ? 'fa-user-slash' : (hasSales ? 'fa-circle-check' : 'fa-moon')}"></i>
              ${isBaja ? 'Dado de Baja' : (hasSales ? 'En Turno' : 'Sin Turno')}
            </span>
          </div>
          <span class="mozo-code-sub">Código #${m.codigo} • ${m.porcentajeTotal}% de facturación</span>
          <div class="mozo-status-tags-row">
            <span class="mozo-badge-period" title="Período de rotación en Gardenias">
              <i class="fa-regular fa-clock"></i>
              <span>${m.periodoActividad || (isBaja ? 'Ex-colaborador' : 'Plantilla Activa')}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="mozo-hire-row">
        <span class="hire-label"><i class="fa-regular fa-calendar-check"></i> Ingreso:</span>
        ${m.fechaIngreso ? `
          <span class="hire-date-val" onclick="event.stopPropagation(); window.openStaffModal(${m.id})" title="Click para ajustar fecha de ingreso">
            ${formatHireDate(m.fechaIngreso)}
            <i class="fa-solid fa-pen-to-square edit-pen"></i>
          </span>
        ` : `
          <button type="button" class="btn-assign-hire" onclick="event.stopPropagation(); window.openStaffModal(${m.id})" title="Asignar fecha de ingreso manualmente">
            <i class="fa-solid fa-calendar-plus"></i> Asignar
          </button>
        `}
      </div>
      ${m.fechaEgreso ? `
        <div class="mozo-hire-row" style="margin-top: -6px; margin-bottom: 10px;">
          <span class="hire-label" style="color: var(--accent-rose);"><i class="fa-solid fa-calendar-xmark"></i> Baja:</span>
          <span class="hire-date-val" onclick="event.stopPropagation(); window.openStaffModal(${m.id})" style="color: var(--accent-rose);" title="Fecha de baja / cese de actividad en Gardenias">
            ${formatHireDate(m.fechaEgreso)}
            <i class="fa-solid fa-pen-to-square edit-pen"></i>
          </span>
        </div>
      ` : ''}

      <div class="mozo-shift-hours-row ${hasSales && m.primeraVenta ? 'has-hours' : 'no-hours'}">
        <span class="shift-hours-label"><i class="fa-regular fa-clock"></i> Horario Ventas:</span>
        ${hasSales && m.primeraVenta ? `
          <div class="shift-hours-times">
            <span class="shift-time-chip first-sale" title="Hora del primer comprobante registrado por este mozo">
              <i class="fa-solid fa-play fa-2xs"></i> 1ra: <strong>${m.primeraVenta}</strong>
            </span>
            <span class="shift-time-arrow"><i class="fa-solid fa-arrow-right-long"></i></span>
            <span class="shift-time-chip last-sale" title="Hora del último comprobante registrado por este mozo">
              <i class="fa-solid fa-flag-checkered fa-2xs"></i> Última: <strong>${m.ultimaVenta || m.primeraVenta}</strong>
            </span>
            ${(m.ultimaVenta && m.ultimaVenta !== m.primeraVenta) ? `
              <span class="shift-duration-tag" title="Duración de la ventana de ventas">
                ${formatShiftDuration(m.primeraVenta, m.ultimaVenta)}
              </span>
            ` : ''}
          </div>
        ` : `
          <span class="shift-no-sales"><i class="fa-solid fa-ban fa-2xs"></i> Sin ventas en turno</span>
        `}
      </div>

      <div class="mozo-card-stats">
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Ventas Totales</span>
          <span class="mozo-stat-val" style="color: ${hasSales ? 'var(--accent-emerald)' : 'var(--text-muted)'};">$${Number(m.ventas).toLocaleString('es-AR')}</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Comprobantes</span>
          <span class="mozo-stat-val">${m.tickets} tickets</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Cubiertos (CUB)</span>
          <span class="mozo-stat-val" style="color: var(--accent-primary); font-weight: 700;">${m.comensales || m.cubiertos || 0} cub</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Ticket Promedio</span>
          <span class="mozo-stat-val">$${Number(m.ticketPromedio).toLocaleString('es-AR')}</span>
        </div>
        <div class="mozo-stat-item" style="grid-column: 1 / -1; display: flex; justify-content: space-between; border-top: 1px dashed var(--border-subtle); padding-top: 6px; margin-top: 2px;">
          <span class="mozo-stat-label">Promedio por Cubierto (CUB)</span>
          <span class="mozo-stat-val" style="color: var(--accent-cyan);">$${Number(m.promedioCubierto || 0).toLocaleString('es-AR')}</span>
        </div>
        <div class="mozo-audit-bar">
          <span class="mozo-audit-badge ${(m.anulaciones || 0) > 0 ? 'badge-audit-warn' : 'badge-audit-ok'}">
            <i class="fa-solid ${(m.anulaciones || 0) > 0 ? 'fa-triangle-exclamation' : 'fa-shield-check'}"></i>
            ${(m.anulaciones || 0) > 0 ? `${m.anulaciones} Anul. (-$${Number(m.impAnulaciones || 0).toLocaleString('es-AR')})` : '0 Anulaciones (Auditado)'}
          </span>
          <span class="mozo-audit-source" title="Origen oficial: Informe de Ventas por Empleado/Mozo de Maxirest POS">
            <i class="fa-solid fa-file-invoice"></i> Inf. Ventas x Mozo
          </span>
        </div>
      </div>

      <div class="mozo-gastronomy-block">
        <div class="mozo-dish-item" title="Plato más vendido por este mozo en el turno">
          <i class="fa-solid fa-utensils"></i>
          <span><strong>Plato Top:</strong> ${m.platoMasVendido && m.platoMasVendido !== '-' ? m.platoMasVendido : (hasSales ? 'Menú del Turno' : 'Sin actividad')}</span>
        </div>
        <div class="mozo-dessert-item" title="Métrica de postres vendidos: unidades, facturación y postre estrella">
          <i class="fa-solid fa-cake-candles"></i>
          <span><strong>Postres:</strong> ${postresUnits > 0 ? `${postresUnits} u. ($${Number(postresFact).toLocaleString('es-AR')}) · <em>${postreName}</em>` : (hasSales ? '0 u. postres registrados' : 'Sin postres en turno')}</span>
        </div>
      </div>

      <div class="mozo-breakdown-hint" title="Ver desglose auditado comanda por comanda de categorías y platos">
        <i class="fa-solid fa-layer-group"></i> Ver comanda auditada y categorías
      </div>

      <div class="mozo-card-footer">
        <span style="color: var(--accent-amber); font-weight: 600;">Prop. ~$${Number(m.propinasEstimadas || 0).toLocaleString('es-AR')}</span>
        <div class="mozo-actions-row">
          ${isBaja ? `
            <button type="button" class="btn-mozo-action btn-reactivar" onclick="event.stopPropagation(); window.quickToggleStaffStatus(${m.id})" title="Reactivar e incorporar a servicio y estadísticas">
              <i class="fa-solid fa-user-plus"></i> Reactivar
            </button>
          ` : `
            <button type="button" class="btn-mozo-action btn-baja" onclick="event.stopPropagation(); window.quickToggleStaffStatus(${m.id})" title="Dar de baja de la plantilla activa">
              <i class="fa-solid fa-user-minus"></i> Dar de Baja
            </button>
          `}
          <button type="button" class="btn-mozo-action btn-edit" onclick="event.stopPropagation(); window.openStaffModal(${m.id})" title="Ajustar rotación y fecha de ingreso">
            <i class="fa-solid fa-pen"></i> Ajustar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  renderMozosMiniList(filtered);
}

function renderMozosMiniList(mozos) {
  const container = document.getElementById('mozos-list-container');
  if (!container) return;

  container.innerHTML = '';
  mozos.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'mozo-item';
    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; margin-bottom: 8px;';
    const monogram = getMonogram(m.nombre);

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-weight: 800; font-size: 11px; color: var(--text-muted); width: 20px;">#${idx + 1}</span>
        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(56, 189, 248, 0.12); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${monogram}</div>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${m.nombre}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${m.tickets} tickets • ${m.comensales || 0} cub${(m.primeraVenta && (m.ventas || 0) > 0) ? ` • ${m.primeraVenta} a ${m.ultimaVenta || m.primeraVenta}` : ''}</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; font-size: 13px; color: var(--accent-emerald);">$${Number(m.ventas).toLocaleString('es-AR')}</div>
        <div style="font-size: 11px; color: var(--accent-primary); font-weight: 600;">${m.porcentajeTotal}%</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// ==========================================================================
// 7. GRÁFICOS EJECUTIVOS (CHART.JS OBSIDIAN THEME)
// ==========================================================================

function renderChartHorarios(horarios) {
  const canvas = document.getElementById('chartHorarios');
  if (!canvas) return;

  const data = horarios || [];
  const labels = data.map(h => h.hora);
  const values = data.map(h => h.importe);

  if (AppState.charts.horarios) {
    AppState.charts.horarios.destroy();
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  AppState.charts.horarios = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Facturación ($)',
        data: values,
        borderColor: '#38bdf8',
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` Facturación: $${Number(ctx.raw).toLocaleString('es-AR')}`
          }
        }
      },
      scales: {
        x: { 
          grid: { color: 'rgba(255, 255, 255, 0.06)' }, 
          ticks: { color: '#94a3b8', font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" } } 
        },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { 
            color: '#94a3b8',
            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
            callback: (v) => '$' + (v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : (v/1000).toFixed(0) + 'k')
          }
        }
      }
    }
  });
}

function renderChartRubrosOverview(rubros) {
  let canvas = document.getElementById('chartRubrosOverview');
  const wrap = canvas ? canvas.parentElement : document.querySelector('.chart-card:has(#chartRubrosOverview) .chart-canvas-wrap');
  if (!wrap) return;

  if (AppState.charts.rubrosOverview) {
    AppState.charts.rubrosOverview.destroy();
    AppState.charts.rubrosOverview = null;
  }

  const entries = Object.entries(rubros || {}).filter(([_, v]) => Math.abs(Number(v)) > 0);

  if (entries.length === 0) {
    wrap.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 220px; text-align: center; color: var(--text-muted); padding: 20px;">
        <i class="fa-solid fa-chart-pie" style="font-size: 32px; margin-bottom: 12px; opacity: 0.4;"></i>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: var(--text-secondary);">Sin informe de ventas por rubro emitido en Maxirest POS</div>
        <div style="font-size: 12px; max-width: 320px; opacity: 0.7;">El informe detallado de rubros no fue emitido para esta fecha en el sistema de caja.</div>
      </div>
    `;
    return;
  }

  // Si se había reemplazado por el empty-state, regenerar el canvas
  if (!document.getElementById('chartRubrosOverview')) {
    wrap.innerHTML = '<canvas id="chartRubrosOverview"></canvas>';
    canvas = document.getElementById('chartRubrosOverview');
  }

  // Ordenar rubros por importe descendente
  entries.sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);
  const totalRubros = values.reduce((s, v) => s + v, 0);

  const rubroColorMap = {
    'PASTELERIA': '#ec4899',
    'ALMUERZO CENA': '#38bdf8',
    'BEBIDAS': '#06b6d4',
    'ADICIONALES': '#10b981',
    'MARKET': '#8b5cf6',
    'POSTRES': '#f59e0b',
    'BOX GDS': '#6366f1',
    'CAFETERIA': '#14b8a6',
    'RUBRO. INEXISTENTE': '#64748b',
    'DESCUENTOS - PROMOS': '#ef4444',
    'AGUA': '#0284c7',
    'ESPECIALES': '#eab308'
  };

  const bgColors = labels.map((l, i) => {
    const clean = l.trim().toUpperCase();
    return rubroColorMap[clean] || ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6366f1', '#14b8a6', '#64748b'][i % 9];
  });

  const ctx = canvas.getContext('2d');
  AppState.charts.rubrosOverview = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#0f172a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { 
            color: '#cbd5e1', 
            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" }, 
            boxWidth: 12, 
            padding: 10,
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const val = data.datasets[0].data[i];
                  const pct = totalRubros > 0 ? ((val / totalRubros) * 100).toFixed(1) : 0;
                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: '#0f172a',
                    lineWidth: 1,
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              const pct = totalRubros > 0 ? ((val / totalRubros) * 100).toFixed(1) : 0;
              return ` $${Number(val).toLocaleString('es-AR')} (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });
}

// ==========================================================================
// 8. SWITCHER DE VISTAS Y EXPORTACIÓN
// ==========================================================================

function initViewSwitcher() {
  const navBtns = document.querySelectorAll('.view-tab-btn');
  const panels = document.querySelectorAll('.dashboard-view-panel');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.view;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // Sincronizar barra superior si entra al análisis por rango
      if (targetId === 'view-range') {
        const btnModeRange = document.getElementById('btn-mode-range');
        const btnModeDay = document.getElementById('btn-mode-day');
        const scopeDayContainer = document.getElementById('scope-day-container');
        const scopeRangeContainer = document.getElementById('scope-range-container');
        if (btnModeRange) btnModeRange.classList.add('active');
        if (btnModeDay) btnModeDay.classList.remove('active');
        if (scopeDayContainer) scopeDayContainer.style.display = 'none';
        if (scopeRangeContainer) scopeRangeContainer.style.display = 'flex';
        AppState.scopeMode = 'range';
        if (!AppState.rangeData) {
          loadRangeData({ preset: AppState.rangePreset || 'quarter' });
        }
      }
    });
  });
}

function initExportStakeholders() {
  const btn = document.getElementById('btn-export-report');
  if (btn) {
    btn.addEventListener('click', () => {
      window.print();
    });
  }
}

// ==========================================================================
// 9. MONITOR DE SALÓN & COMANDAS
// ==========================================================================

function renderTables(mesas) {
  const container = document.getElementById('tables-container');
  if (!container || !mesas) return;

  const filteredMesas = AppState.activeSector === 'ALL' 
    ? mesas 
    : mesas.filter(m => m.sector === AppState.activeSector);

  const badge = document.getElementById('lbl-total-mesas-badge');
  if (badge) badge.textContent = `${filteredMesas.length} Mesas`;
  container.innerHTML = '';

  filteredMesas.forEach(mesa => {
    const card = document.createElement('div');
    const stateKey = mesa.estado ? mesa.estado.toLowerCase() : 'libre';
    card.className = `table-card status-${stateKey}`;
    card.onclick = () => openMesaModal(mesa);

    let dotClass = 'dot-libre';
    if (mesa.estado === 'OCUPADA') dotClass = 'dot-ocupada';
    if (mesa.estado === 'PIDIENDO_CUENTA') dotClass = 'dot-cuenta';
    if (mesa.estado === 'DEMORA') dotClass = 'dot-alerta';

    card.innerHTML = `
      <div class="table-card-top">
        <span class="table-num">Mesa #${mesa.numero}</span>
        <span class="legend-dot ${dotClass}"></span>
      </div>
      <div class="table-mozo-line">${mesa.mozoNombre ? mesa.mozoNombre.split(' ')[0] : 'Sin Asignar'}</div>
      <div class="table-amount-line">${mesa.totalAcumulado > 0 ? '$' + Number(mesa.totalAcumulado).toLocaleString('es-AR') : '$0'}</div>
    `;
    container.appendChild(card);
  });
}

function renderComandas(comandas) {
  const container = document.getElementById('comandas-list-container');
  if (!container || !comandas) return;

  container.innerHTML = '';
  comandas.forEach(c => {
    const card = document.createElement('div');
    card.className = 'comanda-item';
    const isDemorado = c.estado === 'DEMORADO';

    card.innerHTML = `
      <div class="comanda-header-row">
        <span>Mesa #${c.numeroMesa}</span>
        <span style="color: ${isDemorado ? 'var(--accent-rose)' : 'var(--text-muted)'}; font-size: 11px;">
          <i class="fa-regular fa-clock"></i> ${c.demoraMinutos} min
        </span>
      </div>
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${c.articulo}</div>
      <div class="comanda-meta-row">
        <span>${c.rubro}</span>
        <span>Mozo: ${c.mozo ? c.mozo.split(' ')[0] : '-'}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function initUIEvents() {
  const pills = document.querySelectorAll('#sector-filters .pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.activeSector = pill.dataset.sector;
      if (AppState.lastSnapshot) {
        renderTables(AppState.lastSnapshot.mesas);
      }
    });
  });

  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeMesaModal);

  const modalMesa = document.getElementById('modal-mesa');
  if (modalMesa) {
    modalMesa.addEventListener('click', (e) => {
      if (e.target.id === 'modal-mesa') closeMesaModal();
    });
  }

  const settingsModal = document.getElementById('modal-settings');
  const btnSettings = document.getElementById('btn-settings-open');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const formSettings = document.getElementById('form-firebird-config');
  const btnTestConn = document.getElementById('btn-test-firebird');

  if (btnSettings && settingsModal) {
    btnSettings.addEventListener('click', async () => {
      settingsModal.style.display = 'flex';
      try {
        const res = await fetch('/api/automation/status');
        const auto = await res.json();
        const badge = document.getElementById('badge-automation-status');
        const posUserInput = document.getElementById('cfg-pos-user');
        if (posUserInput && auto.user) {
          posUserInput.value = auto.user;
        }
        if (badge && auto.success) {
          if (auto.hasCredentials) {
            badge.className = 'badge-status badge-active';
            badge.innerHTML = '<i class="fa-solid fa-check"></i> Credenciales Configuradas';
          } else {
            badge.className = 'badge-status badge-idle';
            badge.innerHTML = '<i class="fa-solid fa-key"></i> Requiere Clave';
          }
        }
      } catch (e) {}
    });
  }
  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
  }

  if (formSettings) {
    formSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      const posUser = document.getElementById('cfg-pos-user')?.value || '';
      const posPass = document.getElementById('cfg-pos-pass')?.value || '';
      const sqlUser = document.getElementById('cfg-sql-user')?.value || '';
      const sqlPass = document.getElementById('cfg-sql-pass')?.value || '';
      const host = document.getElementById('cfg-host')?.value || '192.168.1.4';
      const port = document.getElementById('cfg-port')?.value || '3399';
      const database = document.getElementById('cfg-dbname')?.value || 'mx_10783';

      try {
        // 1. Guardar credenciales de automatización
        const autoRes = await fetch('/api/automation/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: posUser, password: posPass, dbPassword: sqlPass })
        });
        const autoData = await autoRes.json();

        // 2. Guardar config de MariaDB
        await fetch('/api/config/mariadb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host, port, database, user: sqlUser, password: sqlPass })
        });

        if (settingsModal) settingsModal.style.display = 'none';
        showToast('Configuración y credenciales de automatización guardadas correctamente', 'success');
      } catch (err) {
        showToast('Error guardando configuración de automatización', 'error');
      }
    });
  }

  if (btnTestConn) {
    btnTestConn.addEventListener('click', async () => {
      showToast('Probando conexión con Servidor Maxirest SQL...', 'info');
      try {
        const res = await fetch('/api/status');
        const st = await res.json();
        if (st.engines?.mariadb?.success) {
          showToast(`Conectado al servidor Maxirest (${st.engines.mariadb.latencyMs}ms)`, 'success');
        } else {
          showToast('Servidor Maxirest SQL: ' + (st.engines?.mariadb?.error || 'Sin respuesta'), 'error');
        }
      } catch (e) {
        showToast('Error diagnosticando servidor', 'error');
      }
    });
  }
}

function openMesaModal(mesa) {
  AppState.selectedMesa = mesa;
  document.getElementById('modal-mesa-title').textContent = `Mesa #${mesa.numero} — ${mesa.sector}`;
  document.getElementById('modal-mozo').textContent = mesa.mozoNombre || 'Sin Asignar';
  document.getElementById('modal-comensales').textContent = `${mesa.comensales} personas`;
  document.getElementById('modal-hora').textContent = mesa.horaApertura || '-';
  document.getElementById('modal-tiempo').textContent = mesa.estado !== 'LIBRE' ? `${mesa.minutosOcupada} minutos` : '-';
  document.getElementById('modal-total-amount').textContent = `$${Number(mesa.totalAcumulado).toLocaleString('es-AR')}`;

  const tbody = document.getElementById('modal-items-tbody');
  tbody.innerHTML = '';
  if (mesa.items && mesa.items.length > 0) {
    mesa.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.cantidad}x</strong></td>
        <td>${item.descripcion}</td>
        <td><span style="font-size: 11px; color: var(--text-muted);">${item.rubro}</span></td>
        <td style="text-align: right;">$${Number(item.precioUnitario).toLocaleString('es-AR')}</td>
        <td style="text-align: right; font-weight: 700; color: var(--accent-emerald);">$${Number(item.subtotal).toLocaleString('es-AR')}</td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">Sin consumos activos.</td></tr>`;
  }
  document.getElementById('modal-mesa').style.display = 'flex';
}

function closeMesaModal() {
  AppState.selectedMesa = null;
  const modal = document.getElementById('modal-mesa');
  if (modal) modal.style.display = 'none';
}

function showToast(mensaje, type = 'info') {
  const shelf = document.getElementById('toasts-shelf');
  if (!shelf) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${mensaje}</span>`;
  shelf.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function initAudio() {
  const btn = document.getElementById('btn-audio-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    AppState.soundEnabled = !AppState.soundEnabled;
    btn.innerHTML = AppState.soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    showToast(AppState.soundEnabled ? 'Sonido activado' : 'Sonido silenciado', 'info');
  });
}

// ==========================================================================
// 10. MÓDULO DE ANALÍTICA MULTIDIMENSIONAL POR RANGOS DE FECHAS
// ==========================================================================

function initRangeModule() {
  const btnModeDay = document.getElementById('btn-mode-day');
  const btnModeRange = document.getElementById('btn-mode-range');
  const scopeDayContainer = document.getElementById('scope-day-container');
  const scopeRangeContainer = document.getElementById('scope-range-container');
  const tabNavRange = document.getElementById('tab-nav-range');

  // 1. Selector de Alcance (Día vs Rango)
  if (btnModeDay && btnModeRange) {
    btnModeDay.addEventListener('click', () => {
      btnModeDay.classList.add('active');
      btnModeRange.classList.remove('active');
      if (scopeDayContainer) scopeDayContainer.style.display = 'flex';
      if (scopeRangeContainer) scopeRangeContainer.style.display = 'none';
      AppState.scopeMode = 'day';

      const activeTab = document.querySelector('.view-tab-btn.active');
      if (activeTab && activeTab.dataset.view === 'view-range') {
        const firstTab = document.querySelector('.view-tab-btn[data-view="view-overview"]');
        if (firstTab) firstTab.click();
      }
    });

    btnModeRange.addEventListener('click', () => {
      btnModeRange.classList.add('active');
      btnModeDay.classList.remove('active');
      if (scopeDayContainer) scopeDayContainer.style.display = 'none';
      if (scopeRangeContainer) scopeRangeContainer.style.display = 'flex';
      AppState.scopeMode = 'range';

      if (tabNavRange) tabNavRange.click();
      if (!AppState.rangeData) {
        loadRangeData({ preset: AppState.rangePreset || 'quarter' });
      }
    });
  }

  // 2. Presets de Rango
  const presetButtons = document.querySelectorAll('.range-preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.rangePreset = btn.dataset.preset;

      const fromInput = document.getElementById('range-input-from');
      const toInput = document.getElementById('range-input-to');
      if (btn.dataset.preset === 'quarter' && fromInput && toInput) {
        fromInput.value = '2026-07-01';
        toInput.value = '2026-09-30';
      } else if (btn.dataset.preset === 'month' && fromInput && toInput) {
        fromInput.value = '2026-09-01';
        toInput.value = '2026-09-30';
      } else if (btn.dataset.preset === 'october' && fromInput && toInput) {
        fromInput.value = '2026-10-01';
        toInput.value = '2026-10-14';
      }

      loadRangeData({ preset: AppState.rangePreset });
    });
  });

  // 3. Botón Consultar Período Personalizado
  const btnApplyCustom = document.getElementById('btn-apply-custom-range');
  if (btnApplyCustom) {
    btnApplyCustom.addEventListener('click', () => {
      const fromInput = document.getElementById('range-input-from');
      const toInput = document.getElementById('range-input-to');
      if (!fromInput || !toInput || !fromInput.value || !toInput.value) {
        showToast('Seleccione fecha inicial y final para el rango', 'warning');
        return;
      }
      if (fromInput.value > toInput.value) {
        showToast('La fecha inicial no puede ser posterior a la fecha final', 'warning');
        return;
      }
      presetButtons.forEach(b => b.classList.remove('active'));
      AppState.rangePreset = 'custom';
      AppState.rangeFrom = fromInput.value;
      AppState.rangeTo = toInput.value;

      loadRangeData({ from: AppState.rangeFrom, to: AppState.rangeTo });
    });
  }

  // 4. Sub-Tabs de Dimensiones dentro de view-range
  const subtabBtns = document.querySelectorAll('.range-subtab-btn');
  const subtabPanels = document.querySelectorAll('.range-subtab-panel');

  subtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabBtns.forEach(b => b.classList.remove('active'));
      subtabPanels.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });

      btn.classList.add('active');
      const targetId = btn.dataset.subtab;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
      }
      AppState.rangeSubtab = targetId;

      if (AppState.rangeData) {
        if (targetId === 'range-subtab-rubros') {
          setTimeout(() => renderChartRangeRubros(AppState.rangeData.rubros), 60);
        } else if (targetId === 'range-subtab-horarios') {
          setTimeout(() => renderChartRangeHorarios(AppState.rangeData.horarios), 60);
        } else if (targetId === 'range-subtab-dias') {
          setTimeout(() => renderChartRangeDias(AppState.rangeData.dias), 60);
        }
      }
    });
  });

  // 5. Orden de Platos (Unidades vs Facturación)
  const btnSortUnits = document.getElementById('range-sort-units');
  const btnSortRev = document.getElementById('range-sort-revenue');
  if (btnSortUnits && btnSortRev) {
    btnSortUnits.addEventListener('click', () => {
      btnSortUnits.classList.add('active');
      btnSortRev.classList.remove('active');
      AppState.rangeDishSort = 'unidades';
      if (AppState.rangeData) renderRangeProductsTable(AppState.rangeData.platos);
    });

    btnSortRev.addEventListener('click', () => {
      btnSortRev.classList.add('active');
      btnSortUnits.classList.remove('active');
      AppState.rangeDishSort = 'facturado';
      if (AppState.rangeData) renderRangeProductsTable(AppState.rangeData.platos);
    });
  }

  // 6. Búsqueda y Filtro de Rubro en Platos del Rango
  const searchInput = document.getElementById('range-dish-search');
  const rubroSelect = document.getElementById('range-dish-rubro-filter');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.rangeDishSearch = e.target.value.toLowerCase().trim();
      if (AppState.rangeData) renderRangeProductsTable(AppState.rangeData.platos);
    });
  }

  if (rubroSelect) {
    rubroSelect.addEventListener('change', (e) => {
      AppState.rangeDishRubroFilter = e.target.value;
      if (AppState.rangeData) renderRangeProductsTable(AppState.rangeData.platos);
    });
  }
}

async function loadRangeData(options = {}) {
  const btnApply = document.getElementById('btn-apply-custom-range');
  if (btnApply) {
    btnApply.disabled = true;
    const icon = btnApply.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
  }

  try {
    const params = new URLSearchParams();
    if (options.preset) params.set('preset', options.preset);
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
    if (AppState.rangeDishSort) params.set('sort', AppState.rangeDishSort);

    const res = await fetch(`/api/analytics/range?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      AppState.rangeData = data;
      renderRangeHeaderAndKpis(data);
      renderRangeProductsTable(data.platos);
      renderRangeRubros(data.rubros, data.platos, data.limpiezaCarta);
      renderRangeHorarios(data.horarios, data.franjas);
      renderRangeDias(data.dias);
      renderRangeMozos(data.mozos);

      showToast(`Período auditado: ${data.range.label}`, 'success');
    } else {
      showToast('Error cargando período: ' + (data.error || 'Desconocido'), 'error');
    }
  } catch (err) {
    console.error('[MaxiProtocol] Error cargando rango:', err);
    showToast('Error de conexión al consultar rango de fechas', 'error');
  } finally {
    if (btnApply) {
      btnApply.disabled = false;
      const icon = btnApply.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-magnifying-glass-chart';
    }
  }
}

function renderRangeHeaderAndKpis(data) {
  if (!data || !data.summary) return;
  const s = data.summary;
  const r = data.range;

  // Header
  const titleEl = document.getElementById('range-hero-title');
  const subEl = document.getElementById('range-hero-subtitle');
  const tagEl = document.getElementById('range-pill-tag');
  const diasEl = document.getElementById('range-dias-count');

  if (titleEl) titleEl.textContent = `Análisis Multidimensional: ${r.label}`;
  if (subEl) subEl.textContent = `Auditoría sobre ${Number(s.totalComprobantes).toLocaleString('es-AR')} comprobantes en Maxirest POS: ventas por plato, distribución por categorías, demanda por horarios y liderazgo por mozo.`;
  if (tagEl) tagEl.textContent = (r.preset || 'PERÍODO').toUpperCase();
  if (diasEl) diasEl.textContent = `${r.diasAnalizados || 0} Días Auditados`;

  // Hero KPIs
  const elFact = document.getElementById('range-kpi-facturacion');
  if (elFact) elFact.textContent = Number(s.totalFacturado || 0).toLocaleString('es-AR');

  const elComp = document.getElementById('range-kpi-comprobantes');
  if (elComp) elComp.textContent = `${Number(s.totalComprobantes || 0).toLocaleString('es-AR')} comprobantes`;

  const elProm = document.getElementById('range-kpi-promedio');
  if (elProm) elProm.textContent = `$${Number(s.ticketPromedio || 0).toLocaleString('es-AR')} / ticket`;

  // Cubiertos Totales (CUB) KPI
  const elCub = document.getElementById('range-kpi-cubiertos');
  if (elCub) elCub.textContent = Number(s.totalCubiertos || 0).toLocaleString('es-AR');

  const elPromCub = document.getElementById('range-kpi-promedio-cub');
  if (elPromCub) elPromCub.textContent = `$${Number(s.promedioCubierto || 0).toLocaleString('es-AR')} / comensal`;

  const elCubMozo = document.getElementById('range-kpi-cub-mozo');
  if (elCubMozo && r.diasAnalizados) {
    elCubMozo.innerHTML = `<i class="fa-solid fa-users"></i> ${(s.totalCubiertos / (r.diasAnalizados || 1)).toFixed(0)} cub/día prom.`;
  }

  // Plato más facturado
  if (s.platoEstrellaFacturado) {
    const pf = s.platoEstrellaFacturado;
    const elPfNom = document.getElementById('range-kpi-plato-fact-nombre');
    const elPfMon = document.getElementById('range-kpi-plato-fact-monto');
    const elPfMoz = document.getElementById('range-kpi-plato-fact-mozo');
    if (elPfNom) elPfNom.textContent = pf.nombre;
    if (elPfMon) elPfMon.textContent = `$${Number(pf.total).toLocaleString('es-AR')} (${Number(pf.unidades).toLocaleString('es-AR')} u.)`;
    if (elPfMoz && pf.topMozo) elPfMoz.textContent = `👑 Top: ${pf.topMozo.nombre} (${pf.topMozo.unidades} u.)`;
  }

  // Plato más vendido (unidades gastronómicas reales)
  let pu = s.platoEstrellaUnidades;
  if (pu && (pu.nombre.toUpperCase().includes('CUBIERTO') || pu.codigo === '4031') && data.platos) {
    const platoComida = data.platos.find(p => !p.nombre.toUpperCase().includes('CUBIERTO') && p.codigo !== '4031');
    if (platoComida) pu = platoComida;
  }

  if (pu) {
    const elPuNom = document.getElementById('range-kpi-plato-unid-nombre');
    const elPuCant = document.getElementById('range-kpi-plato-unid-cant');
    const elPuMoz = document.getElementById('range-kpi-plato-unid-mozo');
    if (elPuNom) elPuNom.textContent = pu.nombre;
    if (elPuCant) elPuCant.textContent = `${Number(pu.unidades).toLocaleString('es-AR')} unidades vendidas`;
    if (elPuMoz && pu.topMozo) elPuMoz.textContent = `👑 Top: ${pu.topMozo.nombre} (${pu.topMozo.unidades} u.)`;
  }

  // Rubro dominante
  if (s.rubroLider) {
    const rl = s.rubroLider;
    const elRlNom = document.getElementById('range-kpi-rubro-nombre');
    const elRlMon = document.getElementById('range-kpi-rubro-monto');
    const elRlPct = document.getElementById('range-kpi-rubro-pct');
    if (elRlNom) elRlNom.textContent = rl.rubro;
    if (elRlMon) elRlMon.textContent = `$${Number(rl.facturacion).toLocaleString('es-AR')} facturados`;
    if (elRlPct) elRlPct.textContent = `${rl.porcentaje}% del negocio`;
  }

  // Mozo líder
  if (s.mozoLider) {
    const ml = s.mozoLider;
    const elMlNom = document.getElementById('range-kpi-mozo-nombre');
    const elMlCant = document.getElementById('range-kpi-mozo-cant');
    const elMlMon = document.getElementById('range-kpi-mozo-monto');
    if (elMlNom) elMlNom.textContent = ml.nombre;
    if (elMlCant) elMlCant.textContent = `${Number(ml.cubiertos || ml.unidades).toLocaleString('es-AR')} comensales servidos`;
    if (elMlMon) elMlMon.textContent = `$${Number(ml.facturacion || ml.total).toLocaleString('es-AR')} (${ml.porcentajeVentas}%)`;
  }
}

function renderRangeProductsTable(platos) {
  const tbody = document.getElementById('range-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  // Filtrar estrictamente cualquier residuo de CUBIERTO del ranking de platos culinarios
  let list = (platos || []).filter(p => !p.nombre.toUpperCase().includes('CUBIERTO') && p.codigo !== '4031');

  // Filtro de búsqueda
  if (AppState.rangeDishSearch) {
    const q = AppState.rangeDishSearch;
    list = list.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      (p.rubro && p.rubro.toLowerCase().includes(q)) ||
      (p.topMozo && p.topMozo.nombre && p.topMozo.nombre.toLowerCase().includes(q))
    );
  }

  // Filtro de Rubro
  if (AppState.rangeDishRubroFilter && AppState.rangeDishRubroFilter !== 'ALL') {
    list = list.filter(p => (p.rubro || '').toLowerCase().includes(AppState.rangeDishRubroFilter.toLowerCase()));
  }

  // Orden
  if (AppState.rangeDishSort === 'facturado') {
    list = [...list].sort((a, b) => b.total - a.total);
  } else {
    list = [...list].sort((a, b) => b.unidades - a.unidades);
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <div>No se encontraron artículos para el filtro seleccionado en este período.</div>
        </td>
      </tr>
    `;
    return;
  }

  const maxVal = list[0] ? (AppState.rangeDishSort === 'facturado' ? list[0].total : list[0].unidades) : 1;

  list.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
    const rubroClass = getRubroBadgeClass(p.rubro);
    const currVal = AppState.rangeDishSort === 'facturado' ? p.total : p.unidades;
    const barWidth = Math.max(4, Math.min(100, Math.round((currVal / maxVal) * 100)));

    const topMozoHtml = p.topMozo && p.topMozo.nombre ? `
      <div class="dish-top-mozo-chip" title="${p.topMozo.nombre} vendió ${p.topMozo.unidades} unidades de este plato">
        <span>👑</span>
        <strong>${p.topMozo.nombre}</strong>
        <span>(${p.topMozo.unidades} u. · ${p.topMozo.porcentajeMozo}%)</span>
      </div>
    ` : `<span style="color: var(--text-dim);">-</span>`;

    tr.innerHTML = `
      <td class="dish-rank ${rankClass}">#${idx + 1}</td>
      <td><span class="product-code-badge">${p.codigo || '-'}</span></td>
      <td style="font-weight: 700; color: var(--text-primary);">${p.nombre}</td>
      <td><span class="badge-rubro ${rubroClass}">${p.rubro || 'General'}</span></td>
      <td style="text-align: right; font-weight: 800; color: var(--text-primary); font-size: 14px;">${Number(p.unidades).toLocaleString('es-AR')}</td>
      <td style="text-align: right; color: var(--text-muted);">$${Number(p.precioPromedio).toLocaleString('es-AR')}</td>
      <td style="text-align: right; font-weight: 800; color: var(--accent-emerald); font-size: 14px;">$${Number(p.total).toLocaleString('es-AR')}</td>
      <td>
        <div class="dish-progress-bar-wrap">
          <div class="dish-progress-bar-bg">
            <div class="dish-progress-bar-fill" style="width: ${barWidth}%;"></div>
          </div>
          <span style="font-size: 11px; font-weight: 700; color: var(--accent-primary); min-width: 38px; text-align: right;">${p.porcentajeContribucion}%</span>
        </div>
      </td>
      <td>${topMozoHtml}</td>
      <td style="text-align: center;"><span class="dish-hour-chip">${p.topHora || '14:00'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRangeRubros(rubros, platos, limpiezaCarta) {
  const container = document.getElementById('range-rubros-cards-container');
  if (!container || !rubros) return;

  container.innerHTML = '';
  rubros.forEach(r => {
    const card = document.createElement('div');
    card.className = 'range-rubro-card';
    card.innerHTML = `
      <div class="range-rubro-card-head">
        <span class="range-rubro-name">${r.rubro}</span>
        <span class="range-rubro-pct">${r.porcentaje}% del total</span>
      </div>
      <div class="range-rubro-card-stats">
        <span class="range-rubro-revenue">$${Number(r.facturacion).toLocaleString('es-AR')}</span>
        <span class="range-rubro-units">${Number(r.unidades).toLocaleString('es-AR')} unidades · ${r.platosCount || 0} artículos</span>
      </div>
      <div class="range-rubro-top-dish">
        Plato Insignia: <span>${r.platoTop}</span>
      </div>
    `;
    container.appendChild(card);
  });

  renderChartRangeRubros(rubros);

  // Inicializar y renderizar módulo de Ingeniería de Menú & Limpieza de Carta
  initMenuEngineeringSection(rubros, platos, limpiezaCarta);
}

function initMenuEngineeringSection(rubros, platos, limpiezaCarta) {
  if (!platos || !rubros) return;

  // 1. Actualizar contadores del KPI strip
  updateEngineeringKpiCounts(platos, limpiezaCarta);

  // 2. Construir píldoras dinámicas de categoría
  const pillsContainer = document.getElementById('eng-category-pills');
  if (pillsContainer) {
    pillsContainer.innerHTML = '';

    // Píldora "Todas las Categorías"
    const allPill = document.createElement('button');
    allPill.type = 'button';
    allPill.className = `eng-cat-pill ${AppState.rangeSelectedCategory === 'ALL' ? 'active' : ''}`;
    allPill.dataset.category = 'ALL';
    allPill.innerHTML = `Todas las Categorías <span class="eng-cat-count">${platos.length}</span>`;
    allPill.addEventListener('click', () => {
      document.querySelectorAll('.eng-cat-pill').forEach(p => p.classList.remove('active'));
      allPill.classList.add('active');
      AppState.rangeSelectedCategory = 'ALL';
      renderMenuEngineeringLists();
    });
    pillsContainer.appendChild(allPill);

    // Píldoras individuales por rubro
    rubros.forEach(r => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `eng-cat-pill ${AppState.rangeSelectedCategory === r.rubro ? 'active' : ''}`;
      pill.dataset.category = r.rubro;
      pill.innerHTML = `${r.rubro} <span class="eng-cat-count">${r.platosCount || 0}</span>`;
      pill.addEventListener('click', () => {
        document.querySelectorAll('.eng-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.rangeSelectedCategory = r.rubro;
        renderMenuEngineeringLists();
      });
      pillsContainer.appendChild(pill);
    });
  }

  // 3. Botones de estrategia (Ver Todo, Sacar de Carta, Impulsar Caros, etc.)
  const stratButtons = document.querySelectorAll('.eng-strat-btn');
  stratButtons.forEach(btn => {
    btn.onclick = () => {
      stratButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const strat = btn.dataset.strategy;
      AppState.rangeSelectedStrategy = strat;

      // Sincronizar tarjetas KPI
      document.querySelectorAll('.eng-kpi-card').forEach(card => {
        card.classList.toggle('active', card.dataset.strategy === strat);
      });

      renderMenuEngineeringLists();
    };
  });

  // 4. Tarjetas interactivas de KPI Cuadrantes
  const kpiCards = document.querySelectorAll('.eng-kpi-card');
  kpiCards.forEach(card => {
    card.onclick = () => {
      const strat = card.dataset.strategy;
      const isCurrentlyActive = card.classList.contains('active');

      kpiCards.forEach(c => c.classList.remove('active'));
      stratButtons.forEach(b => b.classList.remove('active'));

      if (isCurrentlyActive) {
        // Toggle hacia "ALL"
        AppState.rangeSelectedStrategy = 'ALL';
        const allBtn = document.querySelector('.eng-strat-btn[data-strategy="ALL"]');
        if (allBtn) allBtn.classList.add('active');
      } else {
        card.classList.add('active');
        AppState.rangeSelectedStrategy = strat;
        const matchingBtn = document.querySelector(`.eng-strat-btn[data-strategy="${strat}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
      }

      renderMenuEngineeringLists();
    };
  });

  // 5. Búsqueda en tiempo real de platos
  const searchInput = document.getElementById('eng-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      AppState.rangeCategorySearch = e.target.value.trim().toLowerCase();
      renderMenuEngineeringLists();
    };
  }

  // 6. Botón de exportación
  const btnExport = document.getElementById('btn-export-limpieza');
  if (btnExport) {
    btnExport.onclick = () => exportMenuEngineeringCSV();
  }

  // 7. Renderizar listas
  renderMenuEngineeringLists();
}

function updateEngineeringKpiCounts(dishes, limpiezaCarta) {
  const cEliminar = document.getElementById('eng-count-eliminar');
  const cImpulsar = document.getElementById('eng-count-impulsar');
  const cEstrella = document.getElementById('eng-count-estrella');
  const cCaballo = document.getElementById('eng-count-caballo');

  if (!dishes) return;
  const nEliminar = dishes.filter(p => p.menuEngineering?.clasificacion === 'ELIMINAR').length;
  const nImpulsar = dishes.filter(p => p.menuEngineering?.clasificacion === 'IMPULSAR').length;
  const nEstrella = dishes.filter(p => p.menuEngineering?.clasificacion === 'ESTRELLA').length;
  const nCaballo = dishes.filter(p => p.menuEngineering?.clasificacion === 'CABALLO').length;

  if (cEliminar) cEliminar.textContent = nEliminar;
  if (cImpulsar) cImpulsar.textContent = nImpulsar;
  if (cEstrella) cEstrella.textContent = nEstrella;
  if (cCaballo) cCaballo.textContent = nCaballo;
}

function renderMenuEngineeringLists() {
  if (!AppState.rangeData || !AppState.rangeData.platos) return;

  const platos = AppState.rangeData.platos;
  const selectedCat = AppState.rangeSelectedCategory || 'ALL';
  const selectedStrat = AppState.rangeSelectedStrategy || 'ALL';
  const searchTerm = (AppState.rangeCategorySearch || '').toLowerCase();

  // Actualizar labels de columnas
  const catLabel = selectedCat === 'ALL' ? 'Todas las Categorías' : selectedCat;
  const topColLabel = document.getElementById('eng-col-category-top-label');
  const bottomColLabel = document.getElementById('eng-col-category-bottom-label');
  if (topColLabel) topColLabel.textContent = catLabel;
  if (bottomColLabel) bottomColLabel.textContent = catLabel;

  // Filtrar según categoría
  let filtered = platos;
  if (selectedCat !== 'ALL') {
    filtered = filtered.filter(p => p.rubro === selectedCat);
  }

  // Actualizar contadores dinámicamente según la categoría activa
  updateEngineeringKpiCounts(filtered);

  // Filtrar según búsqueda de texto
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm) || 
      String(p.codigo).includes(searchTerm) ||
      (p.rubro && p.rubro.toLowerCase().includes(searchTerm))
    );
  }

  // Si hay filtro de estrategia específico
  let strategyFiltered = filtered;
  if (selectedStrat !== 'ALL') {
    strategyFiltered = strategyFiltered.filter(p => p.menuEngineering?.clasificacion === selectedStrat);
  }

  // 1. COLUMNA IZQUIERDA: MÁS VENDIDOS (Top unidades / facturación)
  const topListEl = document.getElementById('eng-top-dishes-list');
  const topCountBadge = document.getElementById('eng-col-top-count');
  if (topListEl) {
    topListEl.innerHTML = '';
    const topDishes = [...strategyFiltered].sort((a, b) => b.unidades - a.unidades).slice(0, 15);
    if (topCountBadge) topCountBadge.textContent = `${topDishes.length} platos líderes`;

    if (topDishes.length === 0) {
      topListEl.innerHTML = `
        <div class="eng-empty-state">
          <i class="fa-solid fa-utensils"></i>
          <span>No se encontraron platos con los filtros seleccionados</span>
        </div>
      `;
    } else {
      topDishes.forEach((p, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
        const badgeClass = p.menuEngineering?.badgeClass || 'badge-caballo';
        const badgeLabel = p.menuEngineering?.etiqueta || '🐎 Alto Volumen';
        const topMozoNom = p.topMozo ? p.topMozo.nombre : 'Varios';

        const card = document.createElement('div');
        card.className = 'eng-dish-card';
        card.innerHTML = `
          <div class="eng-dish-top">
            <div class="eng-dish-rank-title">
              <span class="eng-dish-rank ${rankClass}">#${idx + 1}</span>
              <div>
                <h5 class="eng-dish-name">${p.nombre}</h5>
                <span class="eng-dish-category-code">${p.rubro} · Cód. #${p.codigo}</span>
              </div>
            </div>
            <span class="eng-strategy-badge ${badgeClass}">${badgeLabel}</span>
          </div>

          <div class="eng-dish-metrics-grid">
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Unidades</span>
              <span class="eng-metric-val highlight">${Number(p.unidades).toLocaleString('es-AR')} u.</span>
            </div>
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Precio Prom.</span>
              <span class="eng-metric-val">$${Number(p.precioPromedio).toLocaleString('es-AR')}</span>
            </div>
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Total Facturado</span>
              <span class="eng-metric-val">$${Number(p.total).toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div class="eng-dish-footer">
            <span class="eng-dish-action-text"><i class="fa-solid fa-clock"></i> Pico: ${p.topHora || '14:00'}</span>
            <span class="eng-dish-top-mozo">Top Vendedor: <span>${topMozoNom}</span></span>
          </div>
        `;
        topListEl.appendChild(card);
      });
    }
  }

  // 2. COLUMNA DERECHA: MENOS VENDIDOS & DIAGNÓSTICO (Prioridad Eliminar & Impulsar)
  const bottomListEl = document.getElementById('eng-bottom-dishes-list');
  const bottomCountBadge = document.getElementById('eng-col-bottom-count');
  if (bottomListEl) {
    bottomListEl.innerHTML = '';
    
    // Si no hay filtro de estrategia, priorizamos los que tienen baja salida (ELIMINAR e IMPULSAR)
    let bottomDishes = [];
    if (selectedStrat === 'ALL') {
      const eliminarDishes = filtered.filter(p => p.menuEngineering?.clasificacion === 'ELIMINAR').sort((a, b) => a.unidades - b.unidades);
      const impulsarDishes = filtered.filter(p => p.menuEngineering?.clasificacion === 'IMPULSAR').sort((a, b) => b.precioPromedio - a.precioPromedio);
      const otrosBottom = filtered.filter(p => p.menuEngineering?.clasificacion !== 'ELIMINAR' && p.menuEngineering?.clasificacion !== 'IMPULSAR').sort((a, b) => a.unidades - b.unidades);
      
      bottomDishes = [...eliminarDishes, ...impulsarDishes, ...otrosBottom].slice(0, 15);
    } else {
      bottomDishes = [...strategyFiltered].sort((a, b) => a.unidades - b.unidades).slice(0, 15);
    }

    if (bottomCountBadge) bottomCountBadge.textContent = `${bottomDishes.length} analizados`;

    if (bottomDishes.length === 0) {
      bottomListEl.innerHTML = `
        <div class="eng-empty-state">
          <i class="fa-solid fa-check-double"></i>
          <span>No hay platos de baja rotación en este cuadrante</span>
        </div>
      `;
    } else {
      bottomDishes.forEach(p => {
        const eng = p.menuEngineering || {};
        const isEliminar = eng.clasificacion === 'ELIMINAR';
        const isImpulsar = eng.clasificacion === 'IMPULSAR';
        const badgeClass = eng.badgeClass || (isEliminar ? 'badge-eliminar' : isImpulsar ? 'badge-impulsar' : 'badge-caballo');
        const badgeLabel = eng.etiqueta || (isEliminar ? '🚨 Sacar de Carta' : isImpulsar ? '💎 Impulsar Caro' : 'Baja Salida');
        const topMozoNom = p.topMozo && p.topMozo.unidades > 0 ? p.topMozo.nombre : 'Sin mozo destacado';

        let actionHint = eng.accion || '';
        if (isEliminar) {
          actionHint = `🚨 Sugerencia: Sacar de la carta. Ticket bajo ($${Number(p.precioPromedio).toLocaleString('es-AR')}) y solo ${p.unidades}u. vendidas. Libera mise en place.`;
        } else if (isImpulsar) {
          actionHint = `💎 Oportunidad de Margen: Ticket alto ($${Number(p.precioPromedio).toLocaleString('es-AR')}) con solo ${p.unidades}u. Instruir a mozos para ofrecerlo en salón.`;
        }

        const card = document.createElement('div');
        card.className = 'eng-dish-card';
        card.innerHTML = `
          <div class="eng-dish-top">
            <div class="eng-dish-rank-title">
              <span class="eng-dish-rank" style="color: ${isEliminar ? '#ef4444' : isImpulsar ? '#38bdf8' : 'var(--text-dim)'};"><i class="fa-solid ${isEliminar ? 'fa-triangle-exclamation' : isImpulsar ? 'fa-gem' : 'fa-circle-info'}"></i></span>
              <div>
                <h5 class="eng-dish-name">${p.nombre}</h5>
                <span class="eng-dish-category-code">${p.rubro} · Cód. #${p.codigo}</span>
              </div>
            </div>
            <span class="eng-strategy-badge ${badgeClass}">${badgeLabel}</span>
          </div>

          <div class="eng-dish-metrics-grid">
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Unidades</span>
              <span class="eng-metric-val" style="color: ${isEliminar ? '#f87171' : 'var(--text-primary)'};">${Number(p.unidades).toLocaleString('es-AR')} u.</span>
            </div>
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Precio Prom.</span>
              <span class="eng-metric-val" style="color: ${isImpulsar ? '#38bdf8' : 'var(--text-primary)'};">$${Number(p.precioPromedio).toLocaleString('es-AR')}</span>
            </div>
            <div class="eng-dish-metric">
              <span class="eng-metric-lbl">Total Facturado</span>
              <span class="eng-metric-val">$${Number(p.total).toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div class="eng-dish-footer">
            <span class="eng-dish-action-text">${actionHint}</span>
            <span class="eng-dish-top-mozo">Mozo: <span>${topMozoNom}</span></span>
          </div>
        `;
        bottomListEl.appendChild(card);
      });
    }
  }
}

function exportMenuEngineeringCSV() {
  if (!AppState.rangeData || !AppState.rangeData.platos) {
    showToast('No hay datos disponibles para exportar', 'error');
    return;
  }

  const platos = AppState.rangeData.platos;
  const range = AppState.rangeData.range || { label: 'Período' };
  
  let csv = '\uFEFF'; // BOM para que Excel abra UTF-8 con tildes y caracteres correctos
  csv += 'INFORME DE AUDITORÍA Y LIMPIEZA DE CARTA (MENU ENGINEERING) - MAXIPROTOCOL / MAXIREST\n';
  csv += `Período auditado: ${range.label}\n`;
  csv += `Fecha de generación: ${new Date().toLocaleString('es-AR')}\n\n`;
  csv += 'Código;Plato / Artículo;Categoría / Rubro;Diagnóstico de Carta;Acción Recomendada;Unidades Vendidas;Precio Promedio ($);Facturación Total ($);Top Mozo;Franja Horaria Pico\n';

  platos.forEach(p => {
    const cod = p.codigo || '';
    const nom = (p.nombre || '').replace(/;/g, ',');
    const rub = (p.rubro || '').replace(/;/g, ',');
    const diag = p.menuEngineering ? p.menuEngineering.etiqueta.replace(/;/g, ',') : 'General';
    const accion = p.menuEngineering ? p.menuEngineering.accion.replace(/;/g, ',') : '';
    const unid = p.unidades || 0;
    const precio = p.precioPromedio || 0;
    const total = p.total || 0;
    const mozo = p.topMozo ? p.topMozo.nombre : 'Varios';
    const hora = p.topHora || '14:00';

    csv += `${cod};${nom};${rub};${diag};${accion};${unid};${precio};${total};${mozo};${hora}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MaxiProtocol_Limpieza_Carta_${(range.from || 'periodo')}_a_${(range.to || '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Informe de limpieza de carta descargado con éxito', 'success');
}

function renderChartRangeRubros(rubros) {
  const canvas = document.getElementById('chartRangeRubros');
  if (!canvas || !rubros) return;

  if (AppState.charts.rangeRubros) {
    AppState.charts.rangeRubros.destroy();
  }

  const labels = rubros.map(r => r.rubro);
  const values = rubros.map(r => r.facturacion);

  const ctx = canvas.getContext('2d');
  AppState.charts.rangeRubros = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#cbd5e1', '#f43f5e', '#64748b'],
        borderWidth: 2,
        borderColor: '#0f172a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
            boxWidth: 12,
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` $${Number(ctx.raw).toLocaleString('es-AR')}`
          }
        }
      },
      cutout: '66%'
    }
  });
}

function renderRangeHorarios(horarios, franjas) {
  const container = document.getElementById('range-dayparts-container');
  if (container && franjas) {
    container.innerHTML = '';
    const icons = {
      'Desayuno & Mañana (08:00 - 11:59)': 'fa-mug-saucer',
      'Almuerzo (12:00 - 15:59)': 'fa-utensils',
      'Tarde & Merienda (16:00 - 19:59)': 'fa-cake-candles',
      'Cena & Noche (20:00 - 00:00)': 'fa-wine-glass'
    };

    franjas.forEach(f => {
      const card = document.createElement('div');
      card.className = 'range-daypart-card';
      const icon = icons[f.franja] || 'fa-clock';
      card.innerHTML = `
        <div class="range-daypart-title">
          <i class="fa-solid ${icon}" style="color: var(--accent-primary);"></i>
          <span>${f.franja}</span>
        </div>
        <div class="range-daypart-units">${Number(f.unidades).toLocaleString('es-AR')} u.</div>
        <div class="range-daypart-footer">
          <span>Participación en el día</span>
          <strong style="color: var(--accent-emerald); font-size: 13px;">${f.porcentaje}%</strong>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderChartRangeHorarios(horarios);
}

function renderChartRangeHorarios(horarios) {
  const canvas = document.getElementById('chartRangeHorarios');
  if (!canvas || !horarios) return;

  if (AppState.charts.rangeHorarios) {
    AppState.charts.rangeHorarios.destroy();
  }

  const labels = horarios.map(h => h.horaLabel);
  const values = horarios.map(h => h.unidades);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  AppState.charts.rangeHorarios = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Unidades Vendidas',
        data: values,
        borderColor: '#38bdf8',
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` Salida: ${Number(ctx.raw).toLocaleString('es-AR')} unidades`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
            callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k u.' : v + ' u.'
          }
        }
      }
    }
  });
}

function renderRangeDias(dias) {
  const container = document.getElementById('range-peak-days-container');
  if (container && dias) {
    container.innerHTML = '';
    // Obtener los 6 días con mayor facturación
    const peakDays = [...dias].sort((a, b) => b.facturacion - a.facturacion).slice(0, 6);
    peakDays.forEach((d, idx) => {
      const card = document.createElement('div');
      card.className = 'range-peak-day-card';
      card.innerHTML = `
        <div class="range-peak-day-date">#${idx + 1} · ${d.label}</div>
        <div class="range-peak-day-rev">$${Number(d.facturacion).toLocaleString('es-AR')}</div>
        <div class="range-peak-day-sub">${Number(d.unidades).toLocaleString('es-AR')} unidades · Top: ${d.platoTop}</div>
      `;
      container.appendChild(card);
    });
  }

  renderChartRangeDias(dias);
}

function renderChartRangeDias(dias) {
  const canvas = document.getElementById('chartRangeDias');
  if (!canvas || !dias) return;

  if (AppState.charts.rangeDias) {
    AppState.charts.rangeDias.destroy();
  }

  const labels = dias.map(d => d.label);
  const values = dias.map(d => d.facturacion);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 340);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  AppState.charts.rangeDias = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Facturación Diaria ($)',
        data: values,
        borderColor: '#10b981',
        backgroundColor: gradient,
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` Facturación: $${Number(ctx.raw).toLocaleString('es-AR')}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
            maxTicksLimit: 14
          }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
            callback: (v) => '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k')
          }
        }
      }
    }
  });
}

function renderRangeMozos(mozos) {
  const container = document.getElementById('range-mozos-cards-container');
  if (!container || !mozos) return;

  container.innerHTML = '';
  mozos.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'range-mozo-card';
    card.setAttribute('onclick', `window.openMozoBreakdownModal('${m.nombre.replace(/'/g, "\\'")}', null)`);
    card.setAttribute('title', 'Click para ver desglose auditado de categorías y platos en este período');
    const monogram = getMonogram(m.nombre);
    const facturacionTotal = m.facturacion || m.total || 0;
    const cubiertosAtendidos = m.cubiertos || 0;
    const promedioCub = m.promedioCubierto || (cubiertosAtendidos > 0 ? Math.round(facturacionTotal / cubiertosAtendidos) : 0);

    card.innerHTML = `
      <div class="range-mozo-card-head">
        <div class="range-mozo-avatar">${monogram}</div>
        <div class="range-mozo-meta">
          <div class="range-mozo-name">${m.nombre}</div>
          <div class="range-mozo-rank">Posición #${idx + 1} en el Período (${m.porcentajeVentas || 0}%)</div>
        </div>
      </div>

      <div class="range-mozo-figures">
        <div class="range-figure-item">
          <span class="range-figure-label"><i class="fa-solid fa-users" style="color: var(--accent-cyan); margin-right: 4px;"></i> Cubiertos (CUB)</span>
          <span class="range-figure-val" style="color: var(--accent-cyan); font-weight: 800;">${Number(cubiertosAtendidos).toLocaleString('es-AR')} CUB</span>
        </div>
        <div class="range-figure-item">
          <span class="range-figure-label"><i class="fa-solid fa-cash-register" style="color: var(--accent-emerald); margin-right: 4px;"></i> Facturación</span>
          <span class="range-figure-val" style="color: var(--accent-emerald); font-weight: 800;">$${Number(facturacionTotal).toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div class="range-mozo-subfigures" style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <span>Prom/Cub: <strong style="color: var(--text-primary);">$${Number(promedioCub).toLocaleString('es-AR')}</strong></span>
        <span>Platos Servidos: <strong style="color: var(--text-primary);">${Number(m.unidades || 0).toLocaleString('es-AR')} u.</strong></span>
        <span>Comprobantes: <strong style="color: var(--text-primary);">${Number(m.tickets || 0).toLocaleString('es-AR')}</strong></span>
      </div>

      <div class="range-mozo-star-dish">
        <i class="fa-solid fa-trophy" style="color: var(--accent-amber);"></i>
        <span>Plato Fuerte: <strong>${m.platoEstrella ? m.platoEstrella.nombre : 'Varios'}</strong> (${m.platoEstrella ? m.platoEstrella.unidades : 0} u.)</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function getRubroBadgeClass(rubro) {
  const r = (rubro || '').toLowerCase();
  if (r.includes('almuerzo') || r.includes('cena')) return 'badge-rubro-almuerzo';
  if (r.includes('pastel')) return 'badge-rubro-pasteleria';
  if (r.includes('bebid') || r.includes('vino')) return 'badge-rubro-bebidas';
  if (r.includes('postre')) return 'badge-rubro-postres';
  if (r.includes('caf')) return 'badge-rubro-cafeteria';
  return 'badge-rubro-default';
}

// ============================================================================
// 7. MODAL DE DESGLOSE AUDITADO DE VENTAS POR MOZO (CATEGORÍAS Y PLATOS)
// ============================================================================

let currentBreakdownData = null;
let currentBreakdownMode = 'categories'; // 'categories' | 'timeline'
let timelineSortAsc = true;
let timelineSelectedHour = 'all';

window.openMozoBreakdownModal = async function(mozoName, mozoId) {
  const modal = document.getElementById('modal-mozo-breakdown');
  if (!modal) return;

  const modalName = document.getElementById('modal-breakdown-name');
  const modalAvatar = document.getElementById('modal-breakdown-avatar');
  const modalBadge = document.getElementById('modal-breakdown-badge');
  const modalPeriodText = document.getElementById('modal-breakdown-period-text');
  const modalAlert = document.getElementById('modal-breakdown-alert');
  const accordionContainer = document.getElementById('modal-breakdown-accordion');
  const timelineContainer = document.getElementById('modal-breakdown-timeline');
  const searchInput = document.getElementById('breakdown-dish-search');

  // Pre-cargar nombre e iniciales
  if (modalName) modalName.textContent = mozoName;
  if (modalAvatar) modalAvatar.textContent = getMonogram(mozoName);
  if (modalBadge) {
    modalBadge.className = 'badge-status badge-active';
    modalBadge.textContent = 'Consultando...';
  }
  if (modalAlert) modalAlert.style.display = 'none';
  if (searchInput) searchInput.value = '';
  timelineSelectedHour = 'all';

  // Determinar parámetros según el modo activo
  const params = new URLSearchParams();
  params.set('mozo', mozoName);

  if (AppState.scopeMode === 'range') {
    if (AppState.rangePreset && AppState.rangePreset !== 'custom') {
      params.set('preset', AppState.rangePreset);
    } else if (AppState.rangeFrom && AppState.rangeTo) {
      params.set('from', AppState.rangeFrom);
      params.set('to', AppState.rangeTo);
    } else {
      params.set('preset', 'quarter');
    }
  } else {
    params.set('date', AppState.selectedDate || 'hoy');
  }

  // Loader skeleton
  const loaderHtml = `
    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: var(--accent-primary); margin-bottom: 12px;"></i>
      <div style="font-size: 14px; font-weight: 600; color: #fff;">Auditando comanda por comanda en Maxirest POS...</div>
      <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Recuperando categorías y línea de tiempo de ventas al minuto</div>
    </div>
  `;
  if (accordionContainer) accordionContainer.innerHTML = loaderHtml;
  if (timelineContainer) timelineContainer.innerHTML = loaderHtml;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`/api/mozo/sales-breakdown?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      const errHtml = `
        <div class="breakdown-empty-turn">
          <i class="fa-solid fa-circle-exclamation" style="color: var(--accent-rose);"></i>
          <h4>Error al obtener datos</h4>
          <p>${data.error || 'No se pudo cargar el desglose'}</p>
        </div>
      `;
      if (accordionContainer) accordionContainer.innerHTML = errHtml;
      if (timelineContainer) timelineContainer.innerHTML = errHtml;
      return;
    }

    currentBreakdownData = data;
    renderMozoBreakdownContent(data);
  } catch (err) {
    console.error('[MaxiProtocol] Error cargando desglose de mozo:', err);
    const connErrHtml = `
      <div class="breakdown-empty-turn">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-rose);"></i>
        <h4>Error de conexión</h4>
        <p>No se pudo conectar con el motor analítico de Maxirest POS.</p>
      </div>
    `;
    if (accordionContainer) accordionContainer.innerHTML = connErrHtml;
    if (timelineContainer) timelineContainer.innerHTML = connErrHtml;
  }
};

window.closeMozoBreakdownModal = function() {
  const modal = document.getElementById('modal-mozo-breakdown');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

// Alternar entre modo "Por Categoría" y "Modo Historial Cronológico"
window.switchBreakdownMode = function(mode) {
  currentBreakdownMode = mode;
  const tabCategories = document.getElementById('tab-mode-categories');
  const tabTimeline = document.getElementById('tab-mode-timeline');
  const accordionContainer = document.getElementById('modal-breakdown-accordion');
  const timelineContainer = document.getElementById('modal-breakdown-timeline');
  const catBtnGroup = document.getElementById('breakdown-cat-btn-group');
  const timelineControls = document.getElementById('timeline-controls-group');
  const searchInput = document.getElementById('breakdown-dish-search');

  if (mode === 'categories') {
    if (tabCategories) {
      tabCategories.classList.add('active');
      tabCategories.setAttribute('aria-selected', 'true');
    }
    if (tabTimeline) {
      tabTimeline.classList.remove('active');
      tabTimeline.setAttribute('aria-selected', 'false');
    }
    if (accordionContainer) accordionContainer.style.display = 'flex';
    if (timelineContainer) timelineContainer.style.display = 'none';
    if (catBtnGroup) catBtnGroup.style.display = 'flex';
    if (timelineControls) timelineControls.style.display = 'none';
    if (searchInput) searchInput.placeholder = 'Filtrar plato, vino, café, postre...';
  } else {
    if (tabTimeline) {
      tabTimeline.classList.add('active');
      tabTimeline.setAttribute('aria-selected', 'true');
    }
    if (tabCategories) {
      tabCategories.classList.remove('active');
      tabCategories.setAttribute('aria-selected', 'false');
    }
    if (accordionContainer) accordionContainer.style.display = 'none';
    if (timelineContainer) timelineContainer.style.display = 'flex';
    if (catBtnGroup) catBtnGroup.style.display = 'none';
    if (timelineControls) timelineControls.style.display = 'flex';
    if (searchInput) searchInput.placeholder = 'Filtrar por artículo, mesa, comprobante u hora (ej. 10:30)...';

    if (currentBreakdownData) {
      renderMozoBreakdownTimeline(currentBreakdownData);
    }
  }
};

// Salto directo con 1 clic a un día con auditoría granular de comanda
window.selectAuditedDayAndOpenMozo = async function(dateIso, mozoCodeOrName) {
  try {
    AppState.selectedDate = dateIso;
    AppState.scopeMode = 'single';
    
    // Actualizar píldoras superiores
    const dayPills = document.querySelectorAll('.day-pill');
    dayPills.forEach(p => {
      if (p.dataset.date === dateIso) p.classList.add('active');
      else p.classList.remove('active');
    });

    const singlePicker = document.getElementById('single-date-picker');
    if (singlePicker) singlePicker.value = dateIso;

    // Actualizar datos del dashboard en background
    if (typeof loadDayAnalytics === 'function') {
      loadDayAnalytics(dateIso);
    }

    // Abrir modal del mozo y poner directamente el Modo Historial
    currentBreakdownMode = 'timeline';
    await window.openMozoBreakdownModal(mozoCodeOrName || 'ROCIO');
    window.switchBreakdownMode('timeline');
  } catch (e) {
    console.error('Error jumping to audited day:', e);
  }
};

function renderMozoBreakdownContent(data) {
  const m = data.mozo;
  const p = data.period;
  const k = data.kpis;

  const modalName = document.getElementById('modal-breakdown-name');
  const modalAvatar = document.getElementById('modal-breakdown-avatar');
  const modalBadge = document.getElementById('modal-breakdown-badge');
  const modalPeriodText = document.getElementById('modal-breakdown-period-text');
  const modalAlert = document.getElementById('modal-breakdown-alert');
  const accordionContainer = document.getElementById('modal-breakdown-accordion');
  const tabTimelineCount = document.getElementById('timeline-tab-count');

  if (modalName) modalName.textContent = m.codigo ? `${m.nombre} (Cód. #${m.codigo})` : m.nombre;
  if (modalAvatar) modalAvatar.textContent = getMonogram(m.nombre);
  if (modalPeriodText) modalPeriodText.textContent = `${p.label} · ${p.sublabel || ''}`;

  if (modalBadge) {
    if (!m.enTurno) {
      modalBadge.className = 'badge-status badge-idle';
      modalBadge.innerHTML = '<i class="fa-solid fa-moon"></i> Sin Turno / Franco';
    } else if (m.estado === 'BAJA') {
      modalBadge.className = 'badge-status badge-baja';
      modalBadge.innerHTML = '<i class="fa-solid fa-user-slash"></i> Dado de Baja';
    } else {
      modalBadge.className = 'badge-status badge-active';
      modalBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> En Turno Activo';
    }
  }

  // Actualizar contador en la pestaña de Modo Historial
  if (tabTimelineCount) {
    tabTimelineCount.textContent = (data.timelineCount || 0).toLocaleString('es-AR');
    if (data.tieneHistorialMinuto) {
      tabTimelineCount.style.background = 'rgba(56, 189, 248, 0.2)';
      tabTimelineCount.style.color = '#38bdf8';
    } else {
      tabTimelineCount.style.background = 'rgba(255, 255, 255, 0.08)';
      tabTimelineCount.style.color = 'var(--text-muted)';
    }
  }

  // KPIs
  const elFact = document.getElementById('breakdown-kpi-facturacion');
  const elTicketProm = document.getElementById('breakdown-kpi-ticket-prom');
  const elUnits = document.getElementById('breakdown-kpi-unidades');
  const elPlatoTop = document.getElementById('breakdown-kpi-plato-top');
  const elTks = document.getElementById('breakdown-kpi-tickets');
  const elCub = document.getElementById('breakdown-kpi-cubiertos');
  const elPromCub = document.getElementById('breakdown-kpi-prom-cub');

  if (elFact) elFact.textContent = `$${Number(k.totalFacturado || 0).toLocaleString('es-AR')}`;
  if (elTicketProm) elTicketProm.textContent = `Ticket Prom: $${Number(k.ticketPromedio || 0).toLocaleString('es-AR')}`;
  if (elUnits) elUnits.textContent = `${Number(k.totalUnidades || 0).toLocaleString('es-AR')} u.`;
  if (elPlatoTop) elPlatoTop.textContent = k.platoLider && k.platoLider.nombre !== '-' ? `Top: ${k.platoLider.nombre} (${k.platoLider.unidades}u)` : 'Plato Top: -';
  if (elTks) elTks.textContent = `${Number(k.totalTickets || 0).toLocaleString('es-AR')} tickets`;
  if (elCub) elCub.textContent = `${Number(k.totalCubiertos || 0).toLocaleString('es-AR')} CUB`;
  if (elPromCub) elPromCub.textContent = `Gasto/Cub: $${Number(k.promedioCubierto || 0).toLocaleString('es-AR')}`;

  // Alerta o Badge de Auditoría
  if (modalAlert) {
    if (data.mensaje) {
      modalAlert.style.display = 'flex';
      modalAlert.className = 'modal-breakdown-alert';
      modalAlert.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${data.mensaje}</span>`;
    } else if (m.enTurno) {
      modalAlert.style.display = 'flex';
      modalAlert.className = 'modal-breakdown-alert audit-badge-verified';
      const shiftSpan = (m.primeraVenta && m.ultimaVenta) ? ` · Turno: ${m.primeraVenta} a ${m.ultimaVenta}` : '';
      modalAlert.innerHTML = `<i class="fa-solid fa-shield-check"></i> <span>Turno verificado 1:1 contra informe oficial de ventas por empleado emitido por Maxirest POS (${k.totalTickets} comprobantes cobrados, ${k.totalCubiertos} cubiertos${shiftSpan}).</span>`;
    } else {
      modalAlert.style.display = 'none';
    }
  }

  // Renderizar Categorías
  if (accordionContainer) {
    accordionContainer.innerHTML = '';

    if (!m.enTurno || data.categorias.length === 0) {
      accordionContainer.innerHTML = `
        <div class="breakdown-empty-turn">
          <i class="fa-solid fa-bed"></i>
          <h4 style="font-size: 16px; color: #fff; margin-bottom: 6px;">Sin actividad registrada en este período</h4>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto;">
            ${m.nombre} no tuvo turnos asignados ni ventas emitidas en Maxirest POS para las fechas consultadas (día de franco reglamentario o licencia).
          </p>
        </div>
      `;
    } else {
      data.categorias.forEach((cat, idx) => {
        const card = document.createElement('div');
        card.className = `breakdown-cat-card ${idx === 0 ? 'is-open' : ''}`;
        card.dataset.category = cat.nombre.toLowerCase();

        let itemsRows = '';
        cat.articulos.forEach(art => {
          itemsRows += `
            <tr class="breakdown-item-row" data-name="${art.nombre.toLowerCase()}">
              <td>
                <div class="breakdown-item-name">
                  ${art.codigo && art.codigo !== '-' ? `<span class="breakdown-item-code">#${art.codigo}</span>` : ''}
                  <span>${art.nombre}</span>
                </div>
              </td>
              <td style="text-align: center;">
                <span class="breakdown-qty-badge">${art.unidades} u.</span>
              </td>
              <td style="text-align: right; color: var(--text-muted); font-size: 12px;">
                $${Number(art.precioPromedio).toLocaleString('es-AR')}
              </td>
              <td style="text-align: right; font-weight: 700; color: #fff;">
                $${Number(art.total).toLocaleString('es-AR')}
                <div class="breakdown-share-bar-wrap" title="${art.porcentajeEnCategoria}% de ${cat.nombre}">
                  <div class="breakdown-share-bar" style="width: ${Math.min(100, Math.max(8, art.porcentajeEnCategoria))}%;"></div>
                </div>
              </td>
            </tr>
          `;
        });

        card.innerHTML = `
          <div class="breakdown-cat-header" onclick="this.parentElement.classList.toggle('is-open')">
            <div class="breakdown-cat-left">
              <div class="breakdown-cat-icon"><i class="${cat.icon}"></i></div>
              <div>
                <h4 class="breakdown-cat-title">${cat.nombre}</h4>
              </div>
              <span class="breakdown-cat-pill">${cat.unidades} unidades · ${cat.articulos.length} platos</span>
            </div>
            <div class="breakdown-cat-right">
              <div class="breakdown-cat-total-wrap">
                <div class="breakdown-cat-total">$${Number(cat.total).toLocaleString('es-AR')}</div>
                <div class="breakdown-cat-share">${cat.porcentajeMozo}% de sus ventas</div>
              </div>
              <i class="fa-solid fa-chevron-down breakdown-cat-chevron"></i>
            </div>
          </div>
          <div class="breakdown-cat-body">
            <table class="breakdown-items-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Artículo / Plato</th>
                  <th style="text-align: center; width: 16%;">Cantidad</th>
                  <th style="text-align: right; width: 16%;">Precio Unit.</th>
                  <th style="text-align: right; width: 18%;">Total Facturado</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>
        `;

        accordionContainer.appendChild(card);
      });
    }
  }

  // Si está activo el modo historial, renderizarlo inmediatamente
  if (currentBreakdownMode === 'timeline') {
    window.switchBreakdownMode('timeline');
  } else {
    window.switchBreakdownMode('categories');
  }
}

// Renderizado de la línea de tiempo cronológica minuto a minuto
function renderMozoBreakdownTimeline(data) {
  const container = document.getElementById('modal-breakdown-timeline');
  if (!container) return;

  container.innerHTML = '';
  const m = data.mozo;
  const k = data.kpis;
  const searchInput = document.getElementById('breakdown-dish-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (!m.enTurno) {
    container.innerHTML = `
      <div class="breakdown-empty-turn">
        <i class="fa-solid fa-bed"></i>
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 6px;">Sin actividad registrada en este período</h4>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto;">
          ${m.nombre} no tuvo turnos asignados ni ventas emitidas en Maxirest POS para las fechas consultadas.
        </p>
      </div>
    `;
    return;
  }

  // CASO A: Turno sin DBF de comanda granular (CERO SIMULACIÓN - AVISO DE AUDITORÍA)
  if (!data.tieneHistorialMinuto || !data.timeline || data.timeline.length === 0) {
    const shiftSpan = (m.primeraVenta && m.ultimaVenta) ? `${m.primeraVenta} a ${m.ultimaVenta}` : 'Turno cerrado';
    container.innerHTML = `
      <div class="timeline-audit-notice">
        <div class="timeline-audit-notice-icon">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <div class="timeline-audit-notice-title">
          Balance Oficial Maxirest POS (${shiftSpan})
        </div>
        <div class="timeline-audit-notice-text">
          Este colaborador cuenta con arqueo fiscal oficial consolidado de Maxirest POS, pero no se emitió el archivo temporal de comanda granular en pantalla para este día.
          Para preservar la <strong>fidelidad fiscal 1:1 y la regla de Cero Simulación</strong>, no se extrapolan minutos ficticios.
        </div>

        <div class="timeline-audited-stats-grid">
          <div class="timeline-audited-stat-box">
            <div class="timeline-audited-stat-label">Facturado</div>
            <div class="timeline-audited-stat-val" style="color: var(--accent-emerald);">$${Number(k.totalFacturado).toLocaleString('es-AR')}</div>
          </div>
          <div class="timeline-audited-stat-box">
            <div class="timeline-audited-stat-label">Comprobantes</div>
            <div class="timeline-audited-stat-val" style="color: #c084fc;">${k.totalTickets} tickets</div>
          </div>
          <div class="timeline-audited-stat-box">
            <div class="timeline-audited-stat-label">Cubiertos</div>
            <div class="timeline-audited-stat-val" style="color: var(--accent-amber);">${k.totalCubiertos} CUB</div>
          </div>
          <div class="timeline-audited-stat-box">
            <div class="timeline-audited-stat-label">Primera Venta</div>
            <div class="timeline-audited-stat-val" style="color: var(--accent-cyan);">${m.primeraVenta || '-'}</div>
          </div>
          <div class="timeline-audited-stat-box">
            <div class="timeline-audited-stat-label">Última Venta</div>
            <div class="timeline-audited-stat-val" style="color: var(--accent-cyan);">${m.ultimaVenta || '-'}</div>
          </div>
        </div>

        <div class="timeline-suggested-title">
          <i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-primary); margin-right: 6px;"></i>
          Ver cronología minuto a minuto en turnos auditados con archivo de comandas:
        </div>
        <div class="timeline-suggested-dates">
          <button type="button" class="btn-jump-audited-date" onclick="window.selectAuditedDayAndOpenMozo('2026-10-12', '${m.codigo || m.nombre}')">
            <i class="fa-regular fa-calendar-check"></i> 12/10 (ROCIO: 151 ventas, 10:03 - 18:40)
          </button>
          <button type="button" class="btn-jump-audited-date" onclick="window.selectAuditedDayAndOpenMozo('2026-10-15', 'BELEN')">
            <i class="fa-regular fa-calendar-check"></i> 15/10 (BELEN, MARINA: 481 ventas)
          </button>
          <button type="button" class="btn-jump-audited-date" onclick="window.selectAuditedDayAndOpenMozo('2026-10-08', 'ADRIANA')">
            <i class="fa-regular fa-calendar-check"></i> 08/10 (ADRIANA, BELEN: 415 ventas)
          </button>
          <button type="button" class="btn-jump-audited-date" onclick="window.selectAuditedDayAndOpenMozo('2026-10-07', 'MARINA')">
            <i class="fa-regular fa-calendar-check"></i> 07/10 (MARINA: 302 ventas)
          </button>
          <button type="button" class="btn-jump-audited-date" onclick="window.selectAuditedDayAndOpenMozo('2026-10-02', '${m.codigo || m.nombre}')">
            <i class="fa-regular fa-calendar-check"></i> 02/10 (ROCIO: 195 ventas)
          </button>
        </div>
      </div>
    `;
    return;
  }

  // CASO B: Turno con archivo de comandas auditado (Línea de Tiempo 100% Verídica)
  const allEvents = data.timeline;
  
  // 1. Chips de Filtrado por Franja Horaria
  const hoursMap = {};
  allEvents.forEach(e => {
    const h = e.hora.split(':')[0] + ':00';
    hoursMap[h] = (hoursMap[h] || 0) + 1;
  });

  const sortedHours = Object.keys(hoursMap).sort();
  let chipsHtml = `
    <div class="timeline-hour-filter-chips">
      <button type="button" class="timeline-hour-chip ${timelineSelectedHour === 'all' ? 'active' : ''}" onclick="window.filterTimelineHour('all')">
        Todas <span class="timeline-hour-chip-count">${allEvents.length}</span>
      </button>
  `;

  sortedHours.forEach(h => {
    chipsHtml += `
      <button type="button" class="timeline-hour-chip ${timelineSelectedHour === h ? 'active' : ''}" onclick="window.filterTimelineHour('${h}')">
        ${h} <span class="timeline-hour-chip-count">${hoursMap[h]}</span>
      </button>
    `;
  });
  chipsHtml += '</div>';

  // 2. Filtrado y ordenamiento de eventos
  let filtered = allEvents.filter(ev => {
    if (timelineSelectedHour !== 'all') {
      const evH = ev.hora.split(':')[0] + ':00';
      if (evH !== timelineSelectedHour) return false;
    }
    if (query) {
      const matchArt = ev.articulo.toLowerCase().includes(query);
      const matchMesa = ev.mesa.toLowerCase().includes(query);
      const matchComp = ev.comprobante.toLowerCase().includes(query);
      const matchHora = ev.hora.toLowerCase().includes(query);
      const matchRubro = ev.rubro.toLowerCase().includes(query);
      if (!matchArt && !matchMesa && !matchComp && !matchHora && !matchRubro) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.hora !== b.hora) {
      return timelineSortAsc ? a.hora.localeCompare(b.hora) : b.hora.localeCompare(a.hora);
    }
    if (a.comprobante !== b.comprobante) {
      return a.comprobante.localeCompare(b.comprobante);
    }
    return a.articulo.localeCompare(b.articulo);
  });

  // 3. Tarjeta de resumen de línea de tiempo
  const summaryCard = `
    <div class="timeline-summary-card">
      <div class="timeline-summary-left">
        <span class="timeline-summary-badge">
          <i class="fa-solid fa-clock-rotate-left"></i> ${filtered.length} de ${allEvents.length} ventas
        </span>
        <span class="timeline-summary-span">
          <i class="fa-solid fa-hourglass-start" style="color: var(--accent-cyan); margin-right: 4px;"></i>
          Turno: <strong>${data.timelineFirstHour || '-'}</strong> a <strong>${data.timelineLastHour || '-'}</strong>
        </span>
      </div>
      <div style="font-size: 13px; font-weight: 700; color: #fff;">
        Total Filtrado: <span style="color: var(--accent-emerald);">$${filtered.reduce((s, x) => s + x.total, 0).toLocaleString('es-AR')}</span>
      </div>
    </div>
  `;

  // 4. Stream de Eventos
  let itemsHtml = '';
  if (filtered.length === 0) {
    itemsHtml = `
      <div class="breakdown-empty-turn" style="padding: 30px;">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h4 style="font-size: 15px; color: #fff;">Sin ventas para este filtro</h4>
        <p style="font-size: 12px; color: var(--text-muted);">No se encontraron artículos para la búsqueda o franja horaria seleccionada.</p>
      </div>
    `;
  } else {
    itemsHtml = '<div class="timeline-stream">';
    filtered.forEach(ev => {
      itemsHtml += `
        <div class="timeline-event-row" data-name="${ev.articulo.toLowerCase()}" data-mesa="${ev.mesa.toLowerCase()}" data-comp="${ev.comprobante.toLowerCase()}" data-hora="${ev.hora}">
          <div class="timeline-node-bullet"></div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="timeline-time-badge"><i class="fa-regular fa-clock" style="font-size: 10px; margin-right: 2px;"></i> ${ev.hora}</span>
                <span class="timeline-mesa-tag"><i class="fa-solid fa-chair"></i> Mesa ${ev.mesa}</span>
                <span class="timeline-rubro-pill"><i class="${ev.rubroIcon}"></i> ${ev.rubro}</span>
              </div>
              <div class="timeline-meta-tags">
                <span class="timeline-comp-tag" title="Comprobante fiscal oficial"><i class="fa-solid fa-receipt"></i> ${ev.comprobante}</span>
              </div>
            </div>
            <div class="timeline-card-body">
              <div class="timeline-dish-info">
                ${ev.codigo && ev.codigo !== '-' ? `<span class="timeline-dish-code">#${ev.codigo}</span>` : ''}
                <span class="timeline-dish-name" title="${ev.articulo}">${ev.articulo}</span>
                <span class="breakdown-qty-badge">${ev.cantidad} u.</span>
              </div>
              <div class="timeline-pricing-wrap">
                <div class="timeline-total-amount">$${Number(ev.total).toLocaleString('es-AR')}</div>
                ${ev.cantidad > 1 ? `<div class="timeline-unit-amount">$${Number(ev.punit).toLocaleString('es-AR')} c/u</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    itemsHtml += '</div>';
  }

  container.innerHTML = summaryCard + chipsHtml + itemsHtml;
}

// Filtrar por franja horaria específica en la línea de tiempo
window.filterTimelineHour = function(hour) {
  timelineSelectedHour = hour;
  if (currentBreakdownData) {
    renderMozoBreakdownTimeline(currentBreakdownData);
  }
};

// Alternar orden cronológico ascendente / descendente
window.toggleTimelineSort = function() {
  timelineSortAsc = !timelineSortAsc;
  const label = document.getElementById('timeline-sort-label');
  if (label) {
    label.textContent = timelineSortAsc ? '08:00 → 23:00' : '23:00 → 08:00';
  }
  if (currentBreakdownData) {
    renderMozoBreakdownTimeline(currentBreakdownData);
  }
};

// Configurar eventos del modal de desglose de mozos
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-mozo-breakdown');
  const btnClose = document.getElementById('btn-close-breakdown-modal');
  const btnExpandAll = document.getElementById('btn-breakdown-expand-all');
  const btnCollapseAll = document.getElementById('btn-breakdown-collapse-all');
  const searchInput = document.getElementById('breakdown-dish-search');
  const tabCategories = document.getElementById('tab-mode-categories');
  const tabTimeline = document.getElementById('tab-mode-timeline');
  const btnSortToggle = document.getElementById('btn-timeline-sort-toggle');

  if (tabCategories) {
    tabCategories.addEventListener('click', () => window.switchBreakdownMode('categories'));
  }

  if (tabTimeline) {
    tabTimeline.addEventListener('click', () => window.switchBreakdownMode('timeline'));
  }

  if (btnSortToggle) {
    btnSortToggle.addEventListener('click', window.toggleTimelineSort);
  }

  if (btnClose) {
    btnClose.addEventListener('click', window.closeMozoBreakdownModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeMozoBreakdownModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
      window.closeMozoBreakdownModal();
    }
  });

  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      document.querySelectorAll('.breakdown-cat-card').forEach(c => c.classList.add('is-open'));
    });
  }

  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      document.querySelectorAll('.breakdown-cat-card').forEach(c => c.classList.remove('is-open'));
    });
  }

  // Filtrado reactivo en vivo tanto para Modo Categorías como para Modo Historial
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();

      if (currentBreakdownMode === 'timeline') {
        if (currentBreakdownData) {
          renderMozoBreakdownTimeline(currentBreakdownData);
        }
        return;
      }

      // Modo categorías
      const catCards = document.querySelectorAll('.breakdown-cat-card');

      if (!q) {
        catCards.forEach(card => {
          card.style.display = 'block';
          card.querySelectorAll('.breakdown-item-row').forEach(row => {
            row.style.display = 'table-row';
          });
        });
        return;
      }

      catCards.forEach(card => {
        let visibleCount = 0;
        const rows = card.querySelectorAll('.breakdown-item-row');
        rows.forEach(row => {
          const name = row.dataset.name || '';
          if (name.includes(q)) {
            row.style.display = 'table-row';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (visibleCount > 0) {
          card.style.display = 'block';
          card.classList.add('is-open');
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
});

// ==========================================================================
// 12. CENTRO DE EXPORTACIÓN Y EXTRACCIÓN DE DATOS MAXIREST POS
// ==========================================================================

function openExportModal() {
  const modal = document.getElementById('modal-export-center');
  if (!modal) return;

  const activeDate = AppState.selectedDate || 'ayer';
  const labelEl = document.getElementById('export-modal-active-date');
  if (labelEl) {
    labelEl.textContent = `${activeDate} (${AppState.currentDayData ? AppState.currentDayData.nombreDia : 'Día Seleccionado'})`;
  }

  const btnDlBalance = document.getElementById('btn-dl-balance');
  if (btnDlBalance) {
    btnDlBalance.href = `/api/export/day?date=${encodeURIComponent(activeDate)}`;
    btnDlBalance.download = `Maxirest_Balance_${activeDate}.csv`;
  }

  const btnDlMozos = document.getElementById('btn-dl-mozos');
  if (btnDlMozos) {
    btnDlMozos.href = `/api/export/mozos?date=${encodeURIComponent(activeDate)}`;
    btnDlMozos.download = `Maxirest_Mozos_${activeDate}.csv`;
  }

  const btnDlMenu = document.getElementById('btn-dl-menu');
  if (btnDlMenu) {
    btnDlMenu.href = `/api/export/products?date=${encodeURIComponent(activeDate)}`;
    btnDlMenu.download = `Maxirest_Menu_${activeDate}.csv`;
  }

  modal.style.display = 'flex';
}

function closeExportModal() {
  const modal = document.getElementById('modal-export-center');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const btnExport = document.getElementById('btn-export-report');
  const btnCloseExport = document.getElementById('btn-close-export-modal');
  const modalExport = document.getElementById('modal-export-center');
  const btnResyncModal = document.getElementById('btn-force-resync-modal');

  if (btnExport) {
    btnExport.addEventListener('click', (e) => {
      e.preventDefault();
      openExportModal();
    });
  }

  if (btnCloseExport) {
    btnCloseExport.addEventListener('click', closeExportModal);
  }

  if (modalExport) {
    modalExport.addEventListener('click', (e) => {
      if (e.target === modalExport) closeExportModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalExport && modalExport.style.display !== 'none') {
      closeExportModal();
    }
  });

  if (btnResyncModal) {
    btnResyncModal.addEventListener('click', async () => {
      btnResyncModal.disabled = true;
      btnResyncModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`Sincronización completada: ${data.daysCount} días y ${data.staffCount} mozos auditados`, 'success');
          if (typeof loadDayAnalytics === 'function') {
            loadDayAnalytics(AppState.selectedDate || 'ayer');
          }
          if (typeof loadAvailableDays === 'function') {
            loadAvailableDays();
          }
        } else {
          showToast('Error sincronizando con Maxirest POS', 'error');
        }
      } catch (err) {
        showToast('Error de conexión al sincronizar', 'error');
      } finally {
        btnResyncModal.disabled = false;
        btnResyncModal.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sincronizar Ahora';
      }
    });
  }
});


