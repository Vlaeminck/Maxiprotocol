/**
 * MaxiProtocol - Cliente en Tiempo Real para Maxirest POS
 * Gestión de WebSockets, Renderizado de Salón, Audio Cues y Métricas
 */

// Estado global de la aplicación
const AppState = {
  socket: null,
  activeSector: 'ALL',
  selectedMesa: null,
  soundEnabled: true,
  currentMode: 'SIMULATOR',
  lastSnapshot: null,
  charts: {
    rubros: null,
    pagos: null
  }
};

// ==========================================================================
// 1. INICIALIZACIÓN Y WEBSOCKETS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAudio();
  initSocket();
  initUIEvents();
  initCharts();
});

function initClock() {
  const clockEl = document.getElementById('clock-display');
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }, 1000);
}

function initSocket() {
  const socket = io();
  AppState.socket = socket;

  socket.on('connect', () => {
    console.log('[MaxiProtocol] Conectado al servidor de streaming.');
    updateConnectionStatus(true, '<10ms');
  });

  socket.on('disconnect', () => {
    console.warn('[MaxiProtocol] Desconectado del servidor.');
    updateConnectionStatus(false, 'Desconectado');
  });

  socket.on('initial_state', (data) => {
    console.log('[MaxiProtocol] Estado inicial recibido:', data);
    AppState.currentMode = data.mode;
    updateSourceBadge(data.mode);
    renderAll(data.snapshot);
  });

  socket.on('tick_update', (snapshot) => {
    renderAll(snapshot);
  });

  socket.on('live_event', (evt) => {
    handleLiveEvent(evt);
  });

  socket.on('mode_changed', (data) => {
    AppState.currentMode = data.mode;
    updateSourceBadge(data.mode);
    showToast(`🔄 Modo cambiado a: ${data.mode}`, 'info');
  });
}

function updateConnectionStatus(connected, latency) {
  const pingChip = document.getElementById('chip-ping');
  const txtLatency = document.getElementById('txt-latency');
  if (connected) {
    pingChip.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    txtLatency.textContent = `Latencia: ${latency}`;
  } else {
    pingChip.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    txtLatency.textContent = 'Sin conexión';
  }
}

function updateSourceBadge(mode) {
  const txt = document.getElementById('txt-source-mode');
  const chip = document.getElementById('chip-source');
  if (mode === 'FIREBIRD') {
    txt.textContent = 'BASE FIREBIRD REAL (3050)';
    chip.style.borderColor = 'rgba(6, 182, 212, 0.5)';
  } else {
    txt.textContent = 'EMULADOR MAXIREST ACTIVO';
    chip.style.borderColor = 'rgba(249, 115, 22, 0.5)';
  }
}

// ==========================================================================
// 2. RENDERIZADO CENTRAL DEL DASHBOARD
// ==========================================================================

function renderAll(snapshot) {
  if (!snapshot) return;
  AppState.lastSnapshot = snapshot;

  renderKPIs(snapshot.metricas);
  renderTables(snapshot.mesas);
  renderComandas(snapshot.comandasEnVivo);
  renderMozos(snapshot.mozos);
  updateCharts(snapshot.metricas);

  // Si el modal de mesa está abierto, actualizar sus datos en vivo
  if (AppState.selectedMesa) {
    const updatedMesa = snapshot.mesas.find(m => m.id === AppState.selectedMesa.id);
    if (updatedMesa) {
      updateModalMesaContent(updatedMesa);
    }
  }
}

function renderKPIs(metricas) {
  if (!metricas) return;

  // Facturación
  const facturacionEl = document.getElementById('kpi-facturacion');
  facturacionEl.textContent = Number(metricas.facturacionHoy || 0).toLocaleString('es-AR');

  // Tickets
  document.getElementById('kpi-tickets-count').textContent = `${metricas.totalTickets || 0} tickets cobrados hoy`;

  // Ticket Promedio
  document.getElementById('kpi-ticket-promedio').textContent = Number(metricas.ticketPromedio || 0).toLocaleString('es-AR');

  // Cubiertos
  document.getElementById('kpi-cubiertos-count').textContent = `${metricas.totalCubiertos || 0} comensales atendidos`;

  // Ocupación
  document.getElementById('kpi-ocupacion-pct').textContent = `${metricas.porcentajeOcupacion || 0}%`;
  document.getElementById('kpi-mesas-ratio').textContent = `${metricas.mesasOcupadas}/${metricas.totalMesas} mesas`;
  document.getElementById('kpi-progress-ocupacion').style.width = `${metricas.porcentajeOcupacion || 0}%`;

  // Comandas en Marcha
  document.getElementById('kpi-comandas-activas').textContent = metricas.comandasActivas || 0;
  const demorasTag = document.getElementById('kpi-demoras-tag');
  const demorasCount = metricas.comandasDemoradas || 0;
  demorasTag.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${demorasCount} demoradas`;
  demorasTag.style.color = demorasCount > 0 ? '#ef4444' : '#10b981';
}

function renderTables(mesas) {
  const container = document.getElementById('tables-container');
  if (!container || !mesas) return;

  const filteredMesas = AppState.activeSector === 'ALL' 
    ? mesas 
    : mesas.filter(m => m.sector === AppState.activeSector);

  document.getElementById('lbl-total-mesas-badge').textContent = `${filteredMesas.length} Mesas`;

  container.innerHTML = '';

  filteredMesas.forEach(mesa => {
    const stateClass = `state-${mesa.estado.toLowerCase()}`;
    const card = document.createElement('div');
    card.className = `table-card ${stateClass}`;
    card.onclick = () => openMesaModal(mesa);

    let statusText = 'Libre';
    if (mesa.estado === 'OCUPADA') statusText = 'Ocupada';
    if (mesa.estado === 'PIDIENDO_CUENTA') statusText = 'Cuenta';

    card.innerHTML = `
      <div class="table-card-header">
        <div class="table-number-wrap">
          <span class="table-label">MESA</span>
          <span class="table-number">${mesa.numero}</span>
        </div>
        <div class="table-capacity">
          <i class="fa-solid fa-user-group"></i> ${mesa.comensales}/${mesa.capacidad}
        </div>
      </div>

      <span class="table-status-pill">${statusText}</span>

      <div class="table-info-meta">
        <div class="table-waiter">
          <i class="fa-regular fa-user"></i> ${mesa.mozoNombre ? mesa.mozoNombre.split(' ')[0] : 'Sin asignar'}
        </div>
      </div>

      <div class="table-card-footer">
        <div class="table-time">
          <i class="fa-regular fa-clock"></i> ${mesa.estado !== 'LIBRE' ? mesa.minutosOcupada + ' min' : '-'}
        </div>
        <div class="table-amount">
          ${mesa.totalAcumulado > 0 ? '$' + Number(mesa.totalAcumulado).toLocaleString('es-AR') : '$0'}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderComandas(comandas) {
  const container = document.getElementById('comandas-list-container');
  if (!container || !comandas) return;

  if (comandas.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-dim); font-size: 13px;">
        <i class="fa-solid fa-circle-check" style="font-size: 28px; color: #10b981; margin-bottom: 8px; display: block;"></i>
        No hay comandas pendientes de despacho en este momento.
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  comandas.forEach(c => {
    const card = document.createElement('div');
    card.className = 'comanda-card';
    const isDemorado = c.estado === 'DEMORADO';

    card.innerHTML = `
      <div class="comanda-top">
        <span class="comanda-table-badge">MESA #${c.numeroMesa}</span>
        <span class="comanda-delay ${isDemorado ? 'alerta' : ''}">
          <i class="fa-regular fa-clock"></i> ${c.demoraMinutos} min ${isDemorado ? '⚠️ DEMORADO' : ''}
        </span>
      </div>
      <div class="comanda-desc">${c.articulo}</div>
      <div class="comanda-footer">
        <span><i class="fa-solid fa-tag"></i> ${c.rubro}</span>
        <span><i class="fa-solid fa-user-tie"></i> ${c.mozo.split(' ')[0]}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderMozos(mozos) {
  const container = document.getElementById('mozos-list-container');
  if (!container || !mozos) return;

  const sorted = [...mozos].sort((a, b) => b.ventas - a.ventas);
  container.innerHTML = '';

  sorted.forEach((m, idx) => {
    const row = document.createElement('div');
    row.className = 'mozo-row';

    row.innerHTML = `
      <div class="mozo-profile">
        <span class="mozo-avatar">${m.avatar || '👨‍🍳'}</span>
        <div>
          <div class="mozo-name">${m.nombre}</div>
          <div class="mozo-meta">${m.mesasAtendidas} mesas asignadas</div>
        </div>
      </div>
      <div class="mozo-stats">
        <div class="mozo-sales-value">$${Number(m.ventas).toLocaleString('es-AR')}</div>
        <div class="mozo-rank-badge">#${idx + 1} Ranking</div>
      </div>
    `;

    container.appendChild(row);
  });
}

// ==========================================================================
// 3. GRÁFICOS INTERACTIVOS (CHART.JS)
// ==========================================================================

function initCharts() {
  // Chart Rubros (Doughnut)
  const ctxRubros = document.getElementById('chartRubros').getContext('2d');
  AppState.charts.rubros = new Chart(ctxRubros, {
    type: 'doughnut',
    data: {
      labels: ['Parrilla', 'Cocina', 'Barra', 'Postres', 'Cafetería'],
      datasets: [{
        data: [1, 1, 1, 1, 1],
        backgroundColor: ['#f97316', '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      },
      cutout: '65%'
    }
  });

  // Chart Medios de Pago (Bar)
  const ctxPagos = document.getElementById('chartPagos').getContext('2d');
  AppState.charts.pagos = new Chart(ctxPagos, {
    type: 'bar',
    data: {
      labels: ['QR', 'Débito', 'Crédito', 'Efectivo'],
      datasets: [{
        label: 'Monto ARS',
        data: [1, 1, 1, 1],
        backgroundColor: '#f97316',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function updateCharts(metricas) {
  if (!metricas) return;

  if (AppState.charts.rubros && metricas.ventasPorRubro) {
    const keys = Object.keys(metricas.ventasPorRubro);
    const values = Object.values(metricas.ventasPorRubro);
    AppState.charts.rubros.data.labels = keys;
    AppState.charts.rubros.data.datasets[0].data = values;
    AppState.charts.rubros.update();
  }

  if (AppState.charts.pagos && metricas.distribucionMediosPago) {
    const keys = Object.keys(metricas.distribucionMediosPago).map(k => k.replace('Tarjeta de ', '').replace('Mercado Pago ', ''));
    const values = Object.values(metricas.distribucionMediosPago);
    AppState.charts.pagos.data.labels = keys;
    AppState.charts.pagos.data.datasets[0].data = values;
    AppState.charts.pagos.update();
  }
}

// ==========================================================================
// 4. EVENTOS EN VIVO, NOTIFICACIONES Y SÍNTESIS DE AUDIO
// ==========================================================================

function handleLiveEvent(evt) {
  // Actualizar Ticker
  const ticker = document.getElementById('events-ticker');
  ticker.innerHTML = `<span class="ticker-entry">${evt.mensaje}</span>`;

  // Mostrar Toast
  let toastType = 'info';
  if (evt.tipo === 'MESA_COBRADA') {
    toastType = 'mesa-cobrada';
    playCashSound();
  } else if (evt.tipo === 'ALERTA_COCINA') {
    toastType = 'alerta-cocina';
    playAlertSound();
  } else if (evt.tipo === 'NUEVA_COMANDA') {
    toastType = 'nueva-comanda';
    playBellSound();
  }

  showToast(evt.mensaje, toastType);
}

function showToast(mensaje, type = 'info') {
  const shelf = document.getElementById('toasts-shelf');
  if (!shelf) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <i class="fa-solid fa-circle-info"></i>
    <span>${mensaje}</span>
  `;

  shelf.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Generador de audio sutil (Web Audio API)
let audioCtx = null;

function initAudio() {
  document.getElementById('btn-audio-toggle').addEventListener('click', () => {
    AppState.soundEnabled = !AppState.soundEnabled;
    const btn = document.getElementById('btn-audio-toggle');
    if (AppState.soundEnabled) {
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      btn.classList.remove('muted');
      showToast('🔊 Sonido activado', 'info');
    } else {
      btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      btn.classList.add('muted');
      showToast('🔇 Sonido silenciado', 'info');
    }
  });
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playCashSound() {
  if (!AppState.soundEnabled) return;
  try {
    ensureAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

function playBellSound() {
  if (!AppState.soundEnabled) return;
  try {
    ensureAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {}
}

function playAlertSound() {
  if (!AppState.soundEnabled) return;
  try {
    ensureAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

// ==========================================================================
// 5. MODALES Y EVENTOS DE INTERFAZ
// ==========================================================================

function initUIEvents() {
  // Filtros de Sector
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

  // Pestañas Laterales
  const tabBtns = document.querySelectorAll('.panel-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Modal Mesa Cierre
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    closeMesaModal();
  });

  document.getElementById('modal-mesa').addEventListener('click', (e) => {
    if (e.target.id === 'modal-mesa') closeMesaModal();
  });

  // Modal Settings
  const settingsModal = document.getElementById('modal-settings');
  document.getElementById('btn-settings-open').addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target.id === 'modal-settings') settingsModal.style.display = 'none';
  });

  // Formulario Settings
  document.getElementById('form-firebird-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedMode = document.querySelector('input[name="engineMode"]:checked').value;

    const payload = {
      host: document.getElementById('cfg-host').value,
      port: document.getElementById('cfg-port').value,
      database: document.getElementById('cfg-db').value,
      user: document.getElementById('cfg-user').value,
      password: document.getElementById('cfg-pass').value
    };

    try {
      await fetch('/api/config/firebird', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode })
      });

      settingsModal.style.display = 'none';
      showToast('Configuración guardada y aplicada con éxito.', 'info');
    } catch (err) {
      showToast('Error al actualizar configuración: ' + err.message, 'alerta-cocina');
    }
  });

  // Botón Probar Conexión Firebird
  document.getElementById('btn-test-firebird').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.firebirdTest && data.firebirdTest.success) {
        alert('✅ Conexión exitosa a Firebird:\n' + data.firebirdTest.message);
      } else {
        alert('⚠️ Resultado de prueba Firebird:\n' + (data.firebirdTest?.message || data.firebirdTest?.error || 'No disponible en este equipo sin motor Firebird activo.'));
      }
    } catch (e) {
      alert('Error consultando estado: ' + e.message);
    }
  });
}

function openMesaModal(mesa) {
  AppState.selectedMesa = mesa;
  updateModalMesaContent(mesa);
  document.getElementById('modal-mesa').style.display = 'flex';
}

function closeMesaModal() {
  AppState.selectedMesa = null;
  document.getElementById('modal-mesa').style.display = 'none';
}

function updateModalMesaContent(mesa) {
  document.getElementById('modal-mesa-title').textContent = `Mesa #${mesa.numero} — ${mesa.sector}`;
  const badge = document.getElementById('modal-mesa-badge');
  badge.textContent = mesa.estado;

  if (mesa.estado === 'LIBRE') {
    badge.style.background = 'rgba(16, 185, 129, 0.2)';
    badge.style.color = '#34d399';
  } else if (mesa.estado === 'OCUPADA') {
    badge.style.background = 'rgba(59, 130, 246, 0.2)';
    badge.style.color = '#60a5fa';
  } else {
    badge.style.background = 'rgba(245, 158, 11, 0.2)';
    badge.style.color = '#fbbf24';
  }

  document.getElementById('modal-mozo').textContent = mesa.mozoNombre || 'Sin Asignar';
  document.getElementById('modal-comensales').textContent = `${mesa.comensales} personas`;
  document.getElementById('modal-hora').textContent = mesa.horaApertura || '-';
  document.getElementById('modal-tiempo').textContent = mesa.estado !== 'LIBRE' ? `${mesa.minutosOcupada} minutos` : '-';
  document.getElementById('modal-total-amount').textContent = `$${Number(mesa.totalAcumulado).toLocaleString('es-AR')}`;

  const tbody = document.getElementById('modal-items-tbody');
  tbody.innerHTML = '';

  if (!mesa.items || mesa.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 18px;">Sin comandas activas para esta mesa.</td></tr>`;
    return;
  }

  mesa.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.cantidad}x</strong></td>
      <td>${item.descripcion}</td>
      <td><span style="font-size: 11px; color: var(--text-muted);">${item.rubro}</span></td>
      <td>$${Number(item.precioUnitario).toLocaleString('es-AR')}</td>
      <td><strong>$${Number(item.subtotal).toLocaleString('es-AR')}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}
