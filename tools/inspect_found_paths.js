const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== INSPECCIÓN DE RUTAS Y ARCHIVOS ENCONTRADOS ===\n');

// 1. Leer C:\Users\Gardenias\Documents\maxi.txt
console.log('--- 1. maxi.txt ---');
try {
  const maxiTxt = fs.readFileSync('C:\\Users\\Gardenias\\Documents\\maxi.txt', 'utf8');
  console.log(maxiTxt);
} catch (e) {
  console.log('Error leyendo maxi.txt:', e.message);
}

// 2. Resolver el acceso directo MaxiREST 10783.lnk con PowerShell
console.log('\n--- 2. Destino de MaxiREST 10783.lnk ---');
try {
  const psCmd = `$sh = New-Object -ComObject WScript.Shell; $target = $sh.CreateShortcut('C:\\Users\\Gardenias\\Desktop\\MaxiREST 10783.lnk'); [PSCustomObject]@{ TargetPath = $target.TargetPath; Arguments = $target.Arguments; WorkingDirectory = $target.WorkingDirectory } | Format-List`;
  const lnkOut = execSync(`powershell -Command "${psCmd}"`, { encoding: 'utf8' });
  console.log(lnkOut);
} catch (e) {
  console.log('Error resolviendo .lnk:', e.message);
}

// 3. Inspeccionar C:\MaxiREST_SQL y C:\MaxiRESTSQL--
console.log('\n--- 3. Inspección de C:\\MaxiREST_SQL y C:\\MaxiRESTSQL-- ---');
['C:\\MaxiREST_SQL', 'C:\\MaxiRESTSQL--', 'C:\\MaxiADMIN', 'C:\\MaxiBack'].forEach(d => {
  if (fs.existsSync(d)) {
    console.log(`\nDirectorio: ${d}`);
    try {
      const items = fs.readdirSync(d);
      console.log(`  Total items: ${items.length}`);
      console.log(`  Items:`, items.slice(0, 25).join(', '));
      if (items.length > 25) console.log(`  ... y ${items.length - 25} más`);
    } catch (e) {
      console.log('  Error listando:', e.message);
    }
  }
});
