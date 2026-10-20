const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '..', 'config', 'mozos_daily_audit.json');

const auditData = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));

auditData['2026-10-07'] = {
  fecha: '2026-10-07',
  archivoOrigen: 'Informe.DBF / 39076206.dbf / 111.xls (Informe Oficial Maxirest POS)',
  fechaReporte: '15/10/2026, 11:26:28',
  totales: {
    importe: 2671240,
    tickets: 71,
    cubiertos: 83,
    promedio: 37623.10,
    promedioCubierto: 32183.61
  },
  mozos: [
    {
      id: 17,
      codigo: 500,
      nombre: 'MARKET',
      avatar: '🛍️',
      estado: 'ACTIVO',
      fechaIngreso: '2024-01-01',
      fechaEgreso: null,
      periodoActividad: 'Estación Mostrador / Tienda',
      ventas: 883150,
      tickets: 20,
      cubiertos: 0,
      comensales: 0,
      ticketPromedio: 44158,
      promedioCubierto: 0,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 88315,
      calificacion: '⭐ 5.0',
      platoMasVendido: 'Evento Merienda (15 u.)',
      postres: {
        unidades: 12,
        facturado: 162500,
        postreTop: 'Mini Cakes',
        porcentajeMesas: 60
      },
      porcentajeTotal: 33.06
    },
    {
      id: 3,
      codigo: 315,
      nombre: 'MARINA',
      avatar: '👩‍💻',
      estado: 'ACTIVO',
      fechaIngreso: '2023-05-15',
      fechaEgreso: null,
      periodoActividad: 'Plantilla Activa 2023 - 2026',
      ventas: 586200,
      tickets: 15,
      cubiertos: 30,
      comensales: 30,
      ticketPromedio: 39080,
      promedioCubierto: 19540,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 58620,
      calificacion: '⭐ 4.9',
      platoMasVendido: 'Menú Ejecutivo (20 u.)',
      postres: {
        unidades: 3,
        facturado: 29000,
        postreTop: 'Flan de Ana con DDL',
        porcentajeMesas: 20
      },
      porcentajeTotal: 21.94
    },
    {
      id: 2,
      codigo: 984,
      nombre: 'BELEN',
      avatar: '👩‍🌾',
      estado: 'ACTIVO',
      fechaIngreso: '2024-01-15',
      fechaEgreso: null,
      periodoActividad: 'Plantilla Activa 2024 - 2026',
      ventas: 559410,
      tickets: 14,
      cubiertos: 29,
      comensales: 29,
      ticketPromedio: 39958,
      promedioCubierto: 19290,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 55941,
      calificacion: '⭐ 4.8',
      platoMasVendido: 'Menú Ejecutivo (9 u.)',
      postres: {
        unidades: 9,
        facturado: 66440,
        postreTop: 'Torta del Día',
        porcentajeMesas: 64
      },
      porcentajeTotal: 20.94
    },
    {
      id: 10,
      codigo: 337,
      nombre: 'ADRIANA',
      avatar: '👩‍🦱',
      estado: 'ACTIVO',
      fechaIngreso: '2024-06-01',
      fechaEgreso: null,
      periodoActividad: 'Plantilla Activa 2024 - 2026',
      ventas: 402180,
      tickets: 14,
      cubiertos: 24,
      comensales: 24,
      ticketPromedio: 28727,
      promedioCubierto: 16758,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 40218,
      calificacion: '⭐ 4.7',
      platoMasVendido: 'Café - Latte (10 u.)',
      postres: {
        unidades: 2,
        facturado: 18500,
        postreTop: 'Porción de Torta Golosa',
        porcentajeMesas: 14
      },
      porcentajeTotal: 15.06
    },
    {
      id: 952,
      codigo: 952,
      nombre: 'DELIVERY / PLATAFORMAS',
      avatar: '🛵',
      estado: 'ACTIVO',
      fechaIngreso: '2024-01-01',
      fechaEgreso: null,
      periodoActividad: 'Canal Envíos y Plataformas',
      ventas: 229500,
      tickets: 7,
      cubiertos: 0,
      comensales: 0,
      ticketPromedio: 32786,
      promedioCubierto: 0,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 0,
      calificacion: '⭐ 4.6',
      platoMasVendido: 'Ensalada Calandria (1 u.)',
      postres: {
        unidades: 1,
        facturado: 16500,
        postreTop: 'Frola Chica Membrillo',
        porcentajeMesas: 14
      },
      porcentajeTotal: 8.59
    },
    {
      id: 301,
      codigo: 301,
      nombre: 'BARRA / CAJA',
      avatar: '☕',
      estado: 'ACTIVO',
      fechaIngreso: '2023-11-20',
      fechaEgreso: null,
      periodoActividad: 'Caja y Mostrador Salón',
      ventas: 10800,
      tickets: 1,
      cubiertos: 0,
      comensales: 0,
      ticketPromedio: 10800,
      promedioCubierto: 0,
      anulaciones: 0,
      impAnulaciones: 0,
      propinasEstimadas: 0,
      calificacion: '⭐ 4.5',
      platoMasVendido: 'Borla Nudo Simple Grande (1 u.)',
      postres: {
        unidades: 0,
        facturado: 0,
        postreTop: '-',
        porcentajeMesas: 0
      },
      porcentajeTotal: 0.40
    }
  ]
};

fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditData, null, 2), 'utf8');
console.log('Successfully added audited date 2026-10-07 to config/mozos_daily_audit.json!');
