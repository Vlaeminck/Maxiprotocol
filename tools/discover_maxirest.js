/**
 * MaxiProtocol - Herramienta de Descubrimiento Automático de Maxirest
 * Escanea rutas, detecta archivos .FDB, verifica el puerto 3050 y prueba credenciales.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('🔍 MAXIPROTOCOL — ASISTENTE DE DETECCIÓN DE MAXIREST EN ESTA PC');
console.log('================================================================\n');

// 1. Rutas comunes donde se instala Maxirest y Firebird
const RUTA_CANDIDATAS = [
  'C:\\MaxiRest',
  'C:\\Maxirest',
  'C:\\Archivos de programa\\MaxiRest',
  'C:\\Archivos de programa (x86)\\MaxiRest',
  'C:\\Program Files\\MaxiRest',
  'C:\\Program Files (x86)\\MaxiRest',
  'D:\\MaxiRest',
  'D:\\Maxirest',
  'C:\\Maxi Sistemas',
  'C:\\MaxiSistemas'
];

const RUTA_FIREBIRD = [
  'C:\\Program Files\\Firebird',
  'C:\\Program Files (x86)\\Firebird'
];

let baseDatosEncontradas = [];
let firebirdInstalado = null;

// Paso 1: Buscar carpetas de Maxirest y archivos .FDB
console.log('1️⃣  Escaneando directorios típicos de Maxirest...');
RUTA_CANDIDATAS.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   [✓] Carpeta encontrada: ${dir}`);
    buscarArchivosFDB(dir);
  }
});

function buscarArchivosFDB(directorio, profundidad = 0) {
  if (profundidad > 3) return; // Limitar profundidad
  try {
    const archivos = fs.readdirSync(directorio);
    for (const arch of archivos) {
      const rutaCompleta = path.join(directorio, arch);
      const stat = fs.statSync(rutaCompleta);
      if (stat.isDirectory()) {
        buscarArchivosFDB(rutaCompleta, profundidad + 1);
      } else if (arch.toLowerCase().endsWith('.fdb') || arch.toLowerCase().endsWith('.gdb')) {
        const tamMb = (stat.size / (1024 * 1024)).toFixed(2);
        console.log(`   🎯 Base de datos detectada: ${rutaCompleta} (${tamMb} MB)`);
        baseDatosEncontradas.push(rutaCompleta);
      }
    }
  } catch (e) {
    // Permisos o carpetas protegidas
  }
}

// Paso 2: Verificar instalación de Firebird y aliases.conf
console.log('\n2️⃣  Verificando motor Firebird SQL...');
RUTA_FIREBIRD.forEach(dirFb => {
  if (fs.existsSync(dirFb)) {
    try {
      const subdirs = fs.readdirSync(dirFb);
      subdirs.forEach(sd => {
        const rutaVersion = path.join(dirFb, sd);
        console.log(`   [✓] Servidor Firebird instalado en: ${rutaVersion}`);
        firebirdInstalado = rutaVersion;

        // Leer aliases.conf si existe
        const aliasFile = path.join(rutaVersion, 'aliases.conf');
        if (fs.existsSync(aliasFile)) {
          console.log(`   📄 Leyendo configuración de alias: ${aliasFile}`);
          const contenido = fs.readFileSync(aliasFile, 'utf8');
          contenido.split('\n').forEach(linea => {
            const clean = linea.trim();
            if (clean && !clean.startsWith('#') && clean.includes('=')) {
              console.log(`      * Alias encontrado: ${clean}`);
              const partes = clean.split('=');
              if (partes.length === 2 && fs.existsSync(partes[1].trim())) {
                baseDatosEncontradas.push(partes[1].trim());
              }
            }
          });
        }
      });
    } catch (e) {}
  }
});

// Paso 3: Probar puerto 3050 (Firebird)
console.log('\n3️⃣  Comprobando puerto de red TCP 3050 (Firebird)...');
const socket = new net.Socket();
socket.setTimeout(2500);

socket.connect(3050, '127.0.0.1', () => {
  console.log('   [✓] ¡PUERTO 3050 ABIERTO Y RESPONDIENDO!');
  console.log('   El motor Firebird está corriendo activamente como servicio.');
  socket.destroy();
  procederPruebaConexion();
});

socket.on('error', (err) => {
  console.log('   [⚠️] No se pudo conectar al puerto 3050 en 127.0.0.1');
  console.log('   Causa probable: El servicio de Firebird está detenido o corre en otra IP de la red.');
  procederPruebaConexion();
});

socket.on('timeout', () => {
  console.log('   [⚠️] Tiempo de espera agotado al conectar al puerto 3050.');
  socket.destroy();
  procederPruebaConexion();
});

// Paso 4: Probar conexión con node-firebird si hay bases detectadas
function procederPruebaConexion() {
  console.log('\n4️⃣  Resultados y Configuración recomendada:');
  
  const rutaDbFinal = baseDatosEncontradas.length > 0 
    ? baseDatosEncontradas[0] 
    : 'C:\\MaxiRest\\Datos\\MAXIREST.FDB';

  console.log(`   📍 Ruta de Base de Datos recomendada: ${rutaDbFinal}`);
  console.log(`   🔌 Host: 127.0.0.1`);
  console.log(`   🚪 Puerto: 3050`);
  console.log(`   👤 Usuario estándar: SYSDBA`);
  console.log(`   🔑 Contraseña por defecto: masterkey`);

  // Intentar probar conexión real si el driver está disponible
  try {
    const Firebird = require('node-firebird');
    console.log('\n5️⃣  Probando autenticación directa con Firebird...');
    
    const config = {
      host: '127.0.0.1',
      port: 3050,
      database: rutaDbFinal,
      user: 'SYSDBA',
      password: 'masterkey',
      lowercase_keys: false
    };

    Firebird.attach(config, (err, db) => {
      if (err) {
        console.log(`   [!] No se pudo conectar automáticamente: ${err.message}`);
        console.log('   💡 Si la contraseña fue cambiada por el instalador, verifique con el administrador.');
        guardarConfig(rutaDbFinal);
      } else {
        console.log('   🎉 ¡CONEXIÓN EXITOSA A LA BASE DE DATOS MAXIREST!');
        
        // Listar tablas existentes
        db.query(`
          SELECT TRIM(RDB$RELATION_NAME) AS TABLA 
          FROM RDB$RELATIONS 
          WHERE RDB$VIEW_BLR IS NULL AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
          ORDER BY RDB$RELATION_NAME
        `, (err, rows) => {
          if (!err && rows) {
            console.log(`\n📋 Se detectaron ${rows.length} tablas en la base de datos de Maxirest:`);
            const nombres = rows.map(r => r.TABLA);
            console.log('   Muestra de tablas:', nombres.slice(0, 15).join(', '), '...');
          }
          db.detach();
          guardarConfig(rutaDbFinal);
        });
      }
    });
  } catch (e) {
    guardarConfig(rutaDbFinal);
  }
}

function guardarConfig(rutaDb) {
  const cfg = {
    host: '127.0.0.1',
    port: 3050,
    database: rutaDb,
    user: 'SYSDBA',
    password: 'masterkey'
  };

  const configPath = path.join(__dirname, '..', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  console.log(`\n💾 Archivo de configuración guardado automáticamente en: ${configPath}`);
  console.log('================================================================\n');
}
