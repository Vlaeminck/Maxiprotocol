const MaxirestAnalytics = require('../extractor/maxirest_analytics');
const a = new MaxirestAnalytics();

for (const d of ['2026-10-18', '2026-10-12', '2026-10-15', '2026-10-20']) {
  const data = a.getDayAnalytics(d);
  console.log('\n=== DATE:', d, '===');
  data.mozos.slice(0, 6).forEach(m => {
    console.log(`  ${m.nombre} (#${m.codigo}): $${m.ventas} | 1ra: ${m.primeraVenta} -> Ultima: ${m.ultimaVenta}`);
  });
}
