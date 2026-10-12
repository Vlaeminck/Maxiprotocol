/**
 * MaxiProtocol - Herramienta de Descubrimiento Integral de Maxirest
 * Escanea rutas de POS, tablas DBF, puertos 3399 (MariaDB) y 3050 (Firebird), y servidores en red.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('================================================================');
console.log('🔍 MAXIPROTOCOL — ASISTENTE DE DETECCIÓN INTEGRAL DE MAXIREST');
console.log('================================================================\n');

const resultados = {
  posInstalado: null,
  datosDbf: null,
  mariaDbLocal: null,
  lanServerCaja: null,
  firebird: null,
  modoRecomendado: 'SIMULATOR'
};

// 1. Detección de Instalación de Software Maxirest POS
console.log('1️⃣  Buscando instalación de Maxirest POS...');
const rutasPos = ['C:\\MaxiREST_SQL', 'C:\\Maxirest', 'C:\\Program Files\\MaxiRest', 'C:\\Program Files (x86)\\MaxiRest'];
rutasPos.forEach(r => {
  if (fs.existsSync(r)) {
    const exe = path.join(r, 'MAXIREST.EXE');
    if (fs.existsSync(exe)) {
      console.log(`   [✓] Software Maxirest POS detectado en: ${r}`);
      console.log(`       Ejecutable: ${exe}`);
      resultados.posInstalado = { dir: r, exe };
    }
  }
});

// 2. Detección de Datos Operativos (Tablas DBF)
console.log('\n2️⃣  Buscando tablas de datos operativos de Maxirest...');
const rutaDatos = 'C:\\MaxiRest';
if (fs.existsSync(rutaDatos)) {
  try {
    const files = fs.readdirSync(rutaDatos);
    const dbfFiles = files.filter(f => f.toLowerCase().endsWith('.dbf'));
    if (dbfFiles.length > 0) {
      console.log(`   [✓] Carpeta de datos Maxirest detectada en: ${rutaDatos}`);
      console.log(`       Total de tablas DBF operativas: ${dbfFiles.length} tablas`);
      resultados.datosDbf = { dir: rutaDatos, totalDbf: dbfFiles.length };
      resultados.modoRecomendado = 'MAXIREST_LOCAL';
    }
  } catch (e) {}
}

// 3. Comprobación de Motores SQL (MariaDB en puerto 3399 y Firebird en puerto 3050)
console.log('\n3️⃣  Comprobando puertos y servicios de base de datos...');

function testPort(host, port, timeout = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function ejecutarDiagnosticoRed() {
  // Probar MariaDB Local
  const mariaLocal = await testPort('127.0.0.1', 3399);
  if (mariaLocal) {
    console.log('   [✓] Puerto 3399 (MariaDB Local Maxirest) ACTIVO y RESPONDIENDO.');
    resultados.mariaDbLocal = { host: '127.0.0.1', port: 3399 };
  } else {
    console.log('   [-] Puerto 3399 en 127.0.0.1 inactivo (Servidor local detenido).');
  }

  // Probar Servidor CAJA en LAN
  const serverCaja = await testPort('192.168.1.3', 3399);
  if (serverCaja) {
    console.log('   [✓] ¡SERVIDOR MAXIREST EN RED DETECTADO!');
    console.log('       Host: 192.168.1.3:3399 (Equipo CAJA)');
    resultados.lanServerCaja = { host: '192.168.1.3', port: 3399 };
  }

  // Probar Firebird 3050
  const fbPort = await testPort('127.0.0.1', 3050);
  if (fbPort) {
    console.log('   [✓] Puerto 3050 (Firebird SQL) ACTIVO y RESPONDIENDO.');
    resultados.firebird = { host: '127.0.0.1', port: 3050 };
  } else {
    console.log('   [-] Puerto 3050 (Firebird) no detectado.');
  }

  // Resumen y guardado
  guardarConfiguracion();
}

function guardarConfiguracion() {
  console.log('\n4️⃣  Resultados y Configuración recomendada:');
  console.log(`   🎯 Modo de extracción activo: [${resultados.modoRecomendado}]`);
  console.log(`   📍 Directorio de datos: ${resultados.datosDbf ? resultados.datosDbf.dir : 'No detectado'}`);
  if (resultados.lanServerCaja) {
    console.log(`   📡 Servidor LAN Maxirest: ${resultados.lanServerCaja.host}:${resultados.lanServerCaja.port}`);
  }

  const cfg = {
    mode: resultados.modoRecomendado,
    maxirestPath: resultados.datosDbf ? resultados.datosDbf.dir : 'C:\\MaxiRest',
    systemPaths: {
      posApp: resultados.posInstalado ? resultados.posInstalado.exe : 'C:\\MaxiREST_SQL\\MAXIREST.EXE',
      dataDir: 'C:\\MaxiRest',
      localMariaDbDir: 'C:\\Servidor_MariaDB',
      lanServerHost: '192.168.1.3',
      lanServerPort: 3399,
      lanServerName: 'CAJA',
      clienteId: '10783'
    },
    mariadb: {
      host: resultados.lanServerCaja ? '192.168.1.3' : '127.0.0.1',
      port: 3399,
      database: 'mx_10783',
      user: 'user_10783'
    },
    firebird: {
      host: '127.0.0.1',
      port: 3050,
      database: 'C:\\MaxiRest\\Datos\\MAXIREST.FDB',
      user: 'SYSDBA',
      password: 'masterkey'
    }
  };

  const configPath = path.join(__dirname, '..', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  console.log(`\n💾 Archivo de configuración guardado en: ${configPath}`);
  console.log('================================================================\n');
}

ejecutarDiagnosticoRed();
