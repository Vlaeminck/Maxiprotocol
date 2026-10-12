/**
 * MaxiProtocol - Simulador de Eventos Gastronómicos en Tiempo Real
 * Emula el comportamiento dinámico de una base de datos Maxirest en hora pico.
 */

class RestaurantSimulator {
  constructor() {
    this.mozos = [
      { id: 1, nombre: 'STELLA', ventas: 0, propinas: 0, mesasAtendidas: 0, avatar: '👩‍🍳' },
      { id: 2, nombre: 'BRENDA', ventas: 0, propinas: 0, mesasAtendidas: 0, avatar: '👩‍💼' },
      { id: 3, nombre: 'MELANIE (952)', ventas: 0, propinas: 0, mesasAtendidas: 0, avatar: '🛵' }
    ];

    this.rubros = ['Cocina', 'Parrilla', 'Barra / Bebidas', 'Postres', 'Cafetería'];

    this.articulos = [
      { id: 101, descripcion: 'Bife de Chorizo 400g c/ Papas', rubro: 'Parrilla', precio: 18500 },
      { id: 102, descripcion: 'Ojo de Bife Madurado', rubro: 'Parrilla', precio: 21000 },
      { id: 103, descripcion: 'Milanesa Napolitana gigante', rubro: 'Cocina', precio: 15400 },
      { id: 104, descripcion: 'Sorrentinos de Jamón y Queso', rubro: 'Cocina', precio: 13200 },
      { id: 105, descripcion: 'Empanada Criolla cortada a cuchillo', rubro: 'Cocina', precio: 2400 },
      { id: 106, descripcion: 'Provoleta al Oreganato', rubro: 'Parrilla', precio: 8900 },
      { id: 107, descripcion: 'Vino Malbec Reserva 750ml', rubro: 'Barra / Bebidas', precio: 12500 },
      { id: 108, descripcion: 'Fernet Branca c/ Coca Cola 70/30', rubro: 'Barra / Bebidas', precio: 6200 },
      { id: 109, descripcion: 'Cerveza Patagonia 24.7 500cc', rubro: 'Barra / Bebidas', precio: 5100 },
      { id: 110, descripcion: 'Agua Mineral sin gas 500ml', rubro: 'Barra / Bebidas', precio: 2200 },
      { id: 111, descripcion: 'Flan Casero Mixto (Dulce y Crema)', rubro: 'Postres', precio: 4500 },
      { id: 112, descripcion: 'Tiramisú Tradicional', rubro: 'Postres', precio: 5200 },
      { id: 113, descripcion: 'Café Espresso Doble', rubro: 'Cafetería', precio: 2600 }
    ];

    this.mediosDePago = ['Mercado Pago QR', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Efectivo'];

    // Inicializar 20 mesas en distintos sectores
    this.mesas = [];
    this.initMesas();

    // Métricas del día acumuladas
    this.metricas = {
      facturacionHoy: 1845200,
      totalTickets: 42,
      ticketPromedio: 43933,
      totalCubiertos: 118,
      tiempoPromedioSobremesaMin: 52,
      distribucionMediosPago: {
        'Mercado Pago QR': 745000,
        'Tarjeta de Débito': 490200,
        'Tarjeta de Crédito': 380000,
        'Efectivo': 230000
      },
      ventasPorRubro: {
        'Parrilla': 680000,
        'Cocina': 520000,
        'Barra / Bebidas': 410000,
        'Postres': 145200,
        'Cafetería': 90000
      }
    };

    this.comandasEnVivo = [];
    this.ultimasVentas = [];
    this.initEstadoInicial();
  }

  initMesas() {
    const sectores = [
      { nombre: 'Vereda', count: 11, offset: 1 },
      { nombre: 'Planta Baja', count: 20, offset: 12 },
      { nombre: 'Planta Alta', count: 2, offset: 32 },
      { nombre: 'Terraza', count: 18, offset: 34 }
    ];

    sectores.forEach(sec => {
      for (let i = 0; i < sec.count; i++) {
        const num = sec.offset + i;
        this.mesas.push({
          id: num,
          numero: num,
          sector: sec.nombre,
          capacidad: num % 4 === 0 ? 6 : (num % 2 === 0 ? 4 : 2),
          estado: 'LIBRE', // LIBRE, OCUPADA, PIDIENDO_CUENTA
          comensales: 0,
          idMozo: null,
          mozoNombre: null,
          horaApertura: null,
          minutosOcupada: 0,
          totalAcumulado: 0,
          items: []
        });
      }
    });
  }

  initEstadoInicial() {
    // Ocupar aproximadamente 12 mesas para que comience con actividad vibrante
    const mesasAOcupar = [1, 2, 3, 5, 6, 8, 11, 12, 14, 17, 18];
    const ahora = Date.now();

    mesasAOcupar.forEach((num, index) => {
      const mesa = this.mesas.find(m => m.numero === num);
      if (!mesa) return;

      const mozo = this.mozos[index % this.mozos.length];
      const minutosAtras = Math.floor(Math.random() * 55) + 10;
      const cantPersonas = Math.min(mesa.capacidad, Math.floor(Math.random() * 3) + 2);

      mesa.estado = minutosAtras > 45 ? 'PIDIENDO_CUENTA' : 'OCUPADA';
      mesa.comensales = cantPersonas;
      mesa.idMozo = mozo.id;
      mesa.mozoNombre = mozo.nombre;
      mesa.horaApertura = new Date(ahora - minutosAtras * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      mesa.minutosOcupada = minutosAtras;

      // Asignar artículos pedidos
      const numItems = Math.floor(Math.random() * 4) + 2;
      let total = 0;
      for (let j = 0; j < numItems; j++) {
        const art = this.articulos[Math.floor(Math.random() * this.articulos.length)];
        const cant = Math.floor(Math.random() * 2) + 1;
        mesa.items.push({
          idArticulo: art.id,
          descripcion: art.descripcion,
          rubro: art.rubro,
          cantidad: cant,
          precioUnitario: art.precio,
          subtotal: art.precio * cant
        });
        total += art.precio * cant;
      }
      mesa.totalAcumulado = total;
      mozo.mesasAtendidas += 1;
      mozo.ventas += total;

      // Agregar algunas comandas vivas
      if (mesa.estado === 'OCUPADA' && index % 2 === 0) {
        const art = this.articulos[Math.floor(Math.random() * this.articulos.length)];
        this.comandasEnVivo.push({
          id: Date.now() + index,
          numeroMesa: mesa.numero,
          mozo: mozo.nombre,
          articulo: art.descripcion,
          cantidad: 2,
          rubro: art.rubro,
          horaPedido: new Date(ahora - (minutosAtras % 12) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          demoraMinutos: minutosAtras % 12,
          estado: (minutosAtras % 12) > 8 ? 'DEMORADO' : 'MARCHANDO'
        });
      }
    });
  }

  /**
   * Genera una iteración de cambio en tiempo real (Tick)
   * Devuelve los deltas y el snapshot completo
   */
  tick() {
    const eventos = [];
    const ahora = Date.now();

    // 1. Incrementar minutos de mesas ocupadas
    this.mesas.forEach(m => {
      if (m.estado !== 'LIBRE') {
        m.minutosOcupada += 1;
      }
    });

    // 2. Incrementar demoras de comandas
    this.comandasEnVivo.forEach(c => {
      c.demoraMinutos += 1;
      if (c.demoraMinutos >= 12 && c.estado !== 'DEMORADO') {
        c.estado = 'DEMORADO';
        eventos.push({
          tipo: 'ALERTA_COCINA',
          mensaje: `⚠️ Demora excesiva en Mesa ${c.numeroMesa}: ${c.articulo} (${c.demoraMinutos} min)`,
          mesa: c.numeroMesa,
          demora: c.demoraMinutos
        });
      }
    });

    // 3. Simular transición aleatoria de evento
    const accion = Math.random();

    // A) Cobro y liberación de una mesa en estado PIDIENDO_CUENTA
    const mesaPidiendo = this.mesas.find(m => m.estado === 'PIDIENDO_CUENTA');
    if (mesaPidiendo && accion < 0.35) {
      const medioPago = this.mediosDePago[Math.floor(Math.random() * this.mediosDePago.length)];
      const totalVenta = mesaPidiendo.totalAcumulado;

      this.metricas.facturacionHoy += totalVenta;
      this.metricas.totalTickets += 1;
      this.metricas.totalCubiertos += mesaPidiendo.comensales;
      this.metricas.ticketPromedio = Math.round(this.metricas.facturacionHoy / this.metricas.totalTickets);
      this.metricas.distribucionMediosPago[medioPago] = (this.metricas.distribucionMediosPago[medioPago] || 0) + totalVenta;

      const ventaRegistrada = {
        id: this.metricas.totalTickets,
        mesa: mesaPidiendo.numero,
        mozo: mesaPidiendo.mozoNombre,
        total: totalVenta,
        cubiertos: mesaPidiendo.comensales,
        medioPago: medioPago,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      this.ultimasVentas.unshift(ventaRegistrada);
      if (this.ultimasVentas.length > 15) this.ultimasVentas.pop();

      eventos.push({
        tipo: 'MESA_COBRADA',
        mensaje: `💳 Mesa ${mesaPidiendo.numero} cerrada. Cobro de $${totalVenta.toLocaleString('es-AR')} con ${medioPago}`,
        venta: ventaRegistrada
      });

      // Liberar mesa
      mesaPidiendo.estado = 'LIBRE';
      mesaPidiendo.comensales = 0;
      mesaPidiendo.idMozo = null;
      mesaPidiendo.mozoNombre = null;
      mesaPidiendo.horaApertura = null;
      mesaPidiendo.minutosOcupada = 0;
      mesaPidiendo.totalAcumulado = 0;
      mesaPidiendo.items = [];
    }
    // B) Clientes piden la cuenta en una mesa ocupada
    else if (accion >= 0.35 && accion < 0.60) {
      const mesaOcupada = this.mesas.find(m => m.estado === 'OCUPADA' && m.minutosOcupada >= 25);
      if (mesaOcupada) {
        mesaOcupada.estado = 'PIDIENDO_CUENTA';
        eventos.push({
          tipo: 'CUENTA_SOLICITADA',
          mensaje: `🧾 Mesa ${mesaOcupada.numero} solicitó la cuenta ($${mesaOcupada.totalAcumulado.toLocaleString('es-AR')})`,
          mesa: mesaOcupada.numero
        });
      }
    }
    // C) Nueva comanda ingresada en una mesa ocupada
    else if (accion >= 0.60 && accion < 0.85) {
      const mesaOcupada = this.mesas.find(m => m.estado === 'OCUPADA');
      if (mesaOcupada) {
        const art = this.articulos[Math.floor(Math.random() * this.articulos.length)];
        const cant = Math.floor(Math.random() * 2) + 1;
        const subtotal = art.precio * cant;

        mesaOcupada.items.push({
          idArticulo: art.id,
          descripcion: art.descripcion,
          rubro: art.rubro,
          cantidad: cant,
          precioUnitario: art.precio,
          subtotal: subtotal
        });
        mesaOcupada.totalAcumulado += subtotal;

        // Sumar al mozo
        const mozo = this.mozos.find(moz => moz.id === mesaOcupada.idMozo);
        if (mozo) mozo.ventas += subtotal;

        // Sumar a ventas por rubro
        this.metricas.ventasPorRubro[art.rubro] = (this.metricas.ventasPorRubro[art.rubro] || 0) + subtotal;

        const nuevaComanda = {
          id: Date.now(),
          numeroMesa: mesaOcupada.numero,
          mozo: mesaOcupada.mozoNombre,
          articulo: `${cant}x ${art.descripcion}`,
          cantidad: cant,
          rubro: art.rubro,
          horaPedido: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          demoraMinutos: 0,
          estado: 'MARCHANDO'
        };
        this.comandasEnVivo.unshift(nuevaComanda);
        if (this.comandasEnVivo.length > 12) this.comandasEnVivo.pop();

        eventos.push({
          tipo: 'NUEVA_COMANDA',
          mensaje: `🍽️ Mesa ${mesaOcupada.numero}: Marchando ${cant}x ${art.descripcion} [${art.rubro}]`,
          comanda: nuevaComanda
        });
      }
    }
    // D) Ocupar una mesa libre
    else {
      const mesaLibre = this.mesas.find(m => m.estado === 'LIBRE');
      if (mesaLibre) {
        const mozo = this.mozos[Math.floor(Math.random() * this.mozos.length)];
        const comensales = Math.min(mesaLibre.capacidad, Math.floor(Math.random() * 3) + 2);
        
        mesaLibre.estado = 'OCUPADA';
        mesaLibre.comensales = comensales;
        mesaLibre.idMozo = mozo.id;
        mesaLibre.mozoNombre = mozo.nombre;
        mesaLibre.horaApertura = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        mesaLibre.minutosOcupada = 0;
        mesaLibre.totalAcumulado = 0;
        mesaLibre.items = [];

        // Pedido inicial de bebidas
        const art = this.articulos.find(a => a.rubro === 'Barra / Bebidas') || this.articulos[0];
        const cant = comensales;
        const sub = art.precio * cant;
        mesaLibre.items.push({
          idArticulo: art.id,
          descripcion: art.descripcion,
          rubro: art.rubro,
          cantidad: cant,
          precioUnitario: art.precio,
          subtotal: sub
        });
        mesaLibre.totalAcumulado = sub;
        mozo.mesasAtendidas += 1;
        mozo.ventas += sub;

        eventos.push({
          tipo: 'MESA_ABIERTA',
          mensaje: `👥 Mesa ${mesaLibre.numero} ocupada (${comensales} pers.) - Atiende: ${mozo.nombre}`,
          mesa: mesaLibre.numero
        });
      }
    }

    // Limpiar comandas entregadas aleatoriamente
    if (this.comandasEnVivo.length > 5 && Math.random() < 0.4) {
      const entregada = this.comandasEnVivo.pop();
      eventos.push({
        tipo: 'PLATO_DESPACHADO',
        mensaje: `✅ Salida de cocina para Mesa ${entregada.numeroMesa}: ${entregada.articulo}`
      });
    }

    return {
      eventos,
      snapshot: this.getSnapshot()
    };
  }

  getSnapshot() {
    const ocupadas = this.mesas.filter(m => m.estado !== 'LIBRE').length;
    const ocupacionPorcentaje = Math.round((ocupadas / this.mesas.length) * 100);

    return {
      timestamp: Date.now(),
      tiempoFormateado: new Date().toLocaleTimeString(),
      origenDatos: 'EMULADOR_MAXIREST_ENGINE',
      metricas: {
        ...this.metricas,
        mesasOcupadas: ocupadas,
        mesasLibres: this.mesas.length - ocupadas,
        totalMesas: this.mesas.length,
        porcentajeOcupacion: ocupacionPorcentaje,
        comandasActivas: this.comandasEnVivo.length,
        comandasDemoradas: this.comandasEnVivo.filter(c => c.estado === 'DEMORADO').length
      },
      mesas: this.mesas,
      mozos: this.mozos.map(m => ({ ...m })),
      comandasEnVivo: this.comandasEnVivo,
      ultimasVentas: this.ultimasVentas
    };
  }
}

module.exports = RestaurantSimulator;
