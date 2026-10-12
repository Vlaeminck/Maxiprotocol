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
  selectedDate: '2026-10-10',
  currentDayData: null,
  lastSnapshot: null,
  productSearchTerm: '',
  productCategoryFilter: 'ALL',
  mozoSearchTerm: '',
  mozoSortBy: 'ventas',
  currentMozos: [],
  charts: {
    rubros: null,
    pagos: null,
    horarios: null,
    rubrosOverview: null
  }
};

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
  initProductFilters();
  initMozoControls();
  initExportStakeholders();

  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get('date') || '2026-10-10';
  AppState.selectedDate = initialDate;
  
  const pills = document.querySelectorAll('.day-pill-btn');
  pills.forEach(p => {
    if (p.dataset.date === initialDate) p.classList.add('active');
    else p.classList.remove('active');
  });

  const customInput = document.getElementById('input-custom-date');
  if (customInput) customInput.value = initialDate;

  loadDayData(initialDate);
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
    if (data.snapshot && AppState.selectedDate === '2026-10-12') {
      renderTables(data.snapshot.mesas);
      renderComandas(data.snapshot.comandasEnVivo);
    }
  });

  socket.on('tick_update', (snapshot) => {
    AppState.lastSnapshot = snapshot;
    if (AppState.selectedDate === '2026-10-12') {
      renderTables(snapshot.mesas);
      renderComandas(snapshot.comandasEnVivo);
    }
  });

  socket.on('live_event', (evt) => {
    handleLiveEvent(evt);
  });
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
// 3. SELECTOR MULTI-DÍA Y CARGA DE DATOS
// ==========================================================================

function initDaySelector() {
  const pills = document.querySelectorAll('.day-pill-btn');
  const customDateInput = document.getElementById('input-custom-date');

  function activateDate(targetDate) {
    AppState.selectedDate = targetDate;

    pills.forEach(p => {
      if (p.dataset.date === targetDate) p.classList.add('active');
      else p.classList.remove('active');
    });

    if (customDateInput && customDateInput.value !== targetDate) {
      customDateInput.value = targetDate;
    }

    const newUrl = `${window.location.pathname}?date=${targetDate}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    loadDayData(targetDate);
  }

  pills.forEach(btn => {
    btn.addEventListener('click', () => {
      activateDate(btn.dataset.date);
    });
  });

  if (customDateInput) {
    customDateInput.addEventListener('change', (e) => {
      if (e.target.value && e.target.value.length === 10) {
        activateDate(e.target.value);
      }
    });
  }
}

async function loadDayData(dateKey) {
  try {
    const res = await fetch(`/api/analytics/day?date=${encodeURIComponent(dateKey)}`);
    const json = await res.json();

    if (json.success && json.data) {
      AppState.currentDayData = json.data;
      renderDayAnalytics(json.data);
      showToast(`Auditando período: ${json.data.nombreDia}`, 'info');
    }
  } catch (err) {
    console.error('Error cargando analítica:', err);
    showToast('Error cargando datos: ' + err.message, 'error');
  }
}

function renderDayAnalytics(dayData) {
  if (!dayData) return;

  const kpis = dayData.kpis || {};

  // 1. C-Level KPI Cards
  const lblFact = document.getElementById('lbl-facturacion-card');
  if (lblFact) {
    lblFact.textContent = `Facturación Neta (${dayData.fecha === '2026-10-12' ? 'Hoy' : dayData.fecha.split('-').reverse().slice(0, 2).join('/')})`;
  }
  
  document.getElementById('kpi-facturacion').textContent = Number(kpis.facturacionTotal || 0).toLocaleString('es-AR');
  document.getElementById('kpi-tickets-count').textContent = `${kpis.totalTickets || 0} comprobantes emitidos`;
  
  const trendPill = document.getElementById('kpi-trend-pill');
  if (trendPill) {
    if (kpis.variacionVsAnterior && kpis.variacionVsAnterior !== 'N/A') {
      const isPos = kpis.variacionVsAnterior.startsWith('+');
      trendPill.className = `metric-trend ${isPos ? 'trend-positive' : 'trend-neutral'}`;
      trendPill.innerHTML = `<i class="fa-solid fa-arrow-trend-${isPos ? 'up' : 'down'}"></i> ${kpis.variacionVsAnterior} vs anterior`;
    } else {
      trendPill.className = 'metric-trend trend-neutral';
      trendPill.innerHTML = 'En curso';
    }
  }

  document.getElementById('kpi-ticket-promedio').textContent = Number(kpis.ticketPromedio || 0).toLocaleString('es-AR');
  document.getElementById('kpi-cubiertos-count').textContent = `${kpis.totalComensales || 0} comensales atendidos`;
  document.getElementById('kpi-comensal-avg').textContent = `$${Number(kpis.gastoPromedioComensal || 0).toLocaleString('es-AR')} / comensal`;

  document.getElementById('kpi-ocupacion-pct').textContent = kpis.mesasRotadas || 0;
  document.getElementById('kpi-tiempo-mesa').textContent = `${kpis.tiempoPromedioMesaMin || 0} min permanencia media`;

  document.getElementById('kpi-origen-file').textContent = dayData.archivoOrigen ? dayData.archivoOrigen.split(' ')[0] : 'Maxirest DBF';
  document.getElementById('kpi-fecha-full').textContent = dayData.nombreDia;

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

  // Comisiones bancarias / de plataforma estimadas para toma de decisiones
  const feeMap = {
    'NAVE (Tarjetas)': { feeRate: 0.018, label: 'Arancel NAVE (1.8%)' },
    'Mercado Pago': { feeRate: 0.008, label: 'Arancel QR MP (0.8%)' },
    'PedidosYa': { feeRate: 0.150, label: 'Comisión Delivery (15.0%)' },
    'Efectivo': { feeRate: 0.000, label: 'Efectivo (0% Comisión / 100% Líquido)' },
    'Banco / Transf.': { feeRate: 0.000, label: 'Transferencia Directa (0%)' },
    'Clover / POS': { feeRate: 0.018, label: 'Arancel POS (1.8%)' },
    'Cta. Cte. / Varios': { feeRate: 0.000, label: 'Cuenta Corriente (A cobrar)' }
  };

  entries.forEach(([nombre, data]) => {
    const feeInfo = feeMap[nombre] || { feeRate: 0.015, label: 'Comisión Estimada (1.5%)' };
    const feeAmount = Math.round(data.importe * feeInfo.feeRate);
    const netAmount = data.importe - feeAmount;
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
        <div class="payment-metric-row">
          <span>${feeInfo.label}:</span>
          <span class="payment-commission-val">-$${Number(feeAmount).toLocaleString('es-AR')}</span>
        </div>
        <div class="payment-metric-row" style="padding-top: 4px; border-top: 1px dashed var(--border-subtle); color: var(--text-secondary);">
          <span style="font-weight: 600;">Neto estimado a caja:</span>
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

function renderMozosExecutive(mozos) {
  const container = document.getElementById('mozos-cards-container');
  if (!container) return;

  if (mozos) AppState.currentMozos = mozos;
  const list = AppState.currentMozos || [];
  const term = AppState.mozoSearchTerm || '';
  const sortBy = AppState.mozoSortBy || 'ventas';

  let filtered = list.filter(m => {
    if (!term) return true;
    const matchName = (m.nombre || '').toLowerCase().includes(term);
    const matchCode = String(m.codigo || '').includes(term);
    const matchPlato = (m.platoMasVendido || '').toLowerCase().includes(term);
    return matchName || matchCode || matchPlato;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'tickets') return (b.tickets || 0) - (a.tickets || 0);
    if (sortBy === 'promedio') return (b.ticketPromedio || 0) - (a.ticketPromedio || 0);
    return (b.ventas || 0) - (a.ventas || 0);
  });

  const badge = document.getElementById('mozos-count-badge');
  if (badge) {
    badge.textContent = `${filtered.length} Miembros ${term ? '(Filtrados)' : 'Activos'}`;
  }

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
        No se encontraron mozos que coincidan con "${term}".
      </div>
    `;
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mozo-executive-card';
    const monogram = getMonogram(m.nombre);

    card.innerHTML = `
      <div class="mozo-card-top">
        <div class="mozo-monogram">${monogram}</div>
        <div class="mozo-info-block">
          <h4 class="mozo-name-title">${m.nombre}</h4>
          <span class="mozo-code-sub">Código #${m.codigo} • ${m.porcentajeTotal}% de facturación</span>
        </div>
      </div>

      <div class="mozo-card-stats">
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Ventas Totales</span>
          <span class="mozo-stat-val" style="color: var(--accent-emerald);">$${Number(m.ventas).toLocaleString('es-AR')}</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Ticket Promedio</span>
          <span class="mozo-stat-val">$${Number(m.ticketPromedio).toLocaleString('es-AR')}</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Comprobantes</span>
          <span class="mozo-stat-val">${m.tickets} tickets</span>
        </div>
        <div class="mozo-stat-item">
          <span class="mozo-stat-label">Comensales</span>
          <span class="mozo-stat-val">${m.comensales || 0} personas</span>
        </div>
      </div>

      <div class="mozo-card-footer">
        <div class="mozo-top-dish" title="${m.platoMasVendido || '-'}">
          <i class="fa-solid fa-medal" style="color: var(--accent-amber); margin-right: 4px;"></i>
          <span>${m.platoMasVendido || '-'}</span>
        </div>
        <span style="color: var(--accent-amber); font-weight: 600;">Prop. ~$${Number(m.propinasEstimadas || 0).toLocaleString('es-AR')}</span>
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
          <div style="font-size: 11px; color: var(--text-muted);">${m.tickets} tickets • ${m.comensales || 0} cubiertos</div>
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
  const canvas = document.getElementById('chartRubrosOverview');
  if (!canvas) return;

  const entries = Object.entries(rubros || {});
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);

  if (AppState.charts.rubrosOverview) {
    AppState.charts.rubrosOverview.destroy();
  }

  const ctx = canvas.getContext('2d');
  AppState.charts.rubrosOverview = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#cbd5e1'],
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

  if (btnSettings && settingsModal) {
    btnSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
  }
  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
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

function handleLiveEvent(evt) {
  const ticker = document.getElementById('events-ticker');
  if (ticker && evt) {
    ticker.innerHTML = `<span class="ticker-entry"><i class="fa-solid ${evt.icono || 'fa-bolt'}"></i> ${evt.titulo}: ${evt.mensaje} (${evt.hora})</span>`;
  }
}
