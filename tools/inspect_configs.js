const fs = require('fs');
const path = require('path');

console.log('=== INSPECCIÓN DE CONFIGURACIÓN Y BASES DE DATOS EN MAXIREST_SQL ===\n');

// 1. Leer C:\MaxiBack\Instalacion terminal nueva.txt
console.log('--- 1. Instalacion terminal nueva.txt ---');
try {
  const txt = fs.readFileSync('C:\\MaxiBack\\Instalacion terminal nueva.txt', 'latin1');
  console.log(txt);
} catch (e) {
  console.log('Error:', e.message);
}

// 2. Leer C:\MaxiBack\BAT FIREWALL.bat
console.log('\n--- 2. BAT FIREWALL.bat ---');
try {
  const bat = fs.readFileSync('C:\\MaxiBack\\BAT FIREWALL.bat', 'latin1');
  console.log(bat);
} catch (e) {
  console.log('Error:', e.message);
}

// 3. Buscar archivos de configuración en C:\MaxiREST_SQL
console.log('\n--- 3. Archivos INI/CFG/TXT en C:\\MaxiREST_SQL ---');
try {
  const items = fs.readdirSync('C:\\MaxiREST_SQL');
  const configs = items.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.ini', '.cfg', '.conf', '.txt', '.xml', '.json', '.dat', '.inf'].includes(ext);
  });
  console.log(`Encontrados ${configs.length} archivos de config:`, configs);

  configs.forEach(cfg => {
    const p = path.join('C:\\MaxiREST_SQL', cfg);
    try {
      const st = fs.statSync(p);
      if (st.size < 50000) {
        const content = fs.readFileSync(p, 'latin1');
        console.log(`\n>>> Contenido de ${cfg} (${st.size} bytes):`);
        console.log(content.slice(0, 1000));
        if (content.length > 1000) console.log('... [truncado]');
      }
    } catch (e) {}
  });
} catch (e) {
  console.log('Error:', e.message);
}
