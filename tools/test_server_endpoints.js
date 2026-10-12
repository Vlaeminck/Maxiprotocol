const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== TESTEANDO ENDPOINTS DE MAXIPROTOCOL ===\n');

  console.log('1. GET /api/status:');
  const status = await get('/api/status');
  console.log(JSON.stringify(status, null, 2));

  console.log('\n2. GET /api/system-paths:');
  const paths = await get('/api/system-paths');
  console.log(JSON.stringify(paths, null, 2));

  console.log('\n3. GET /api/snapshot (KPIs y Mesas):');
  const snapshot = await get('/api/snapshot');
  console.log('Metricas:', JSON.stringify(snapshot.metricas, null, 2));
  console.log(`Total Mesas: ${snapshot.mesas.length}`);
  console.log(`Total Mozos: ${snapshot.mozos.length} (${snapshot.mozos.map(m => m.nombre).join(', ')})`);
  console.log(`Comandas activas: ${snapshot.comandasEnVivo.length}`);
  console.log('Muestra Comanda:', JSON.stringify(snapshot.comandasEnVivo[0], null, 2));
}

run().catch(console.error);
