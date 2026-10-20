const fs = require('fs');
const path = require('path');
const http = require('http');

const MAXIREST_DIR = 'C:/MaxiRest';
const SQL_DIR = 'C:/MaxiREST_SQL';

function fetchApi(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: e.message, raw: data });
        }
      });
    }).on('error', err => reject(err));
  });
}

function parseDbfHeader(buf) {
  if (buf.length < 32) return null;
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  let offset = 32;
  const fields = [];
  while (offset < headerLen - 1 && offset < buf.length) {
    if (buf[offset] === 0x0D) break;
    const name = buf.toString('ascii', offset, offset + 11).replace(/\0/g, '').trim();
    const len = buf[offset + 16];
    fields.push({ name, len });
    offset += 32;
  }
  return { numRecords, headerLen, recordLen, fields };
}

async function runAudit() {
  console.log('=====================================================');
  console.log('🔍 INICIANDO AUDITORÍA FORENSE INTEGRAL 1:1 MAXIPROTOCOL');
  console.log('=====================================================');

  const auditLog = {
    timestamp: new Date().toISOString(),
    filesAudited: [],
    conceptDbfs: [],
    detailedDbfs: [],
    daysAudited: {},
    discrepancies: []
  };

  // 1. Escanear C:/MaxiRest y C:/MaxiREST_SQL
  const files = [];
  if (fs.existsSync(MAXIREST_DIR)) {
    fs.readdirSync(MAXIREST_DIR).forEach(f => {
      if (f.toLowerCase().endsWith('.dbf')) files.push(path.join(MAXIREST_DIR, f));
    });
  }
  if (fs.existsSync(SQL_DIR)) {
    fs.readdirSync(SQL_DIR).forEach(f => {
      if (f.toLowerCase().endsWith('.dbf')) files.push(path.join(SQL_DIR, f));
    });
  }

  console.log(`[1] Total archivos DBF encontrados: ${files.length}`);

  // 2. Identificar tablas de Concepto (CUB, SALON, TOTAL, VENTAS)
  const conceptRecords = {};
  for (const fp of files) {
    try {
      const buf = fs.readFileSync(fp);
      const head = parseDbfHeader(buf);
      if (!head) continue;
      const fn = head.fields.map(f => f.name.toUpperCase());
      if (fn.includes('CUB') && fn.includes('SALON') && fn.includes('TOTAL') && fn.includes('VENTAS')) {
        auditLog.conceptDbfs.push({ path: fp, records: head.numRecords, fields: fn });

        // Leer registros
        for (let r = 0; r < head.numRecords; r++) {
          const recOff = head.headerLen + r * head.recordLen;
          if (recOff + head.recordLen > buf.length || buf[recOff] === 0x2A) continue;
          let cur = recOff + 1;
          const row = {};
          head.fields.forEach(f => {
            row[f.name.toUpperCase()] = buf.slice(cur, cur + f.len).toString('latin1').trim();
            cur += f.len;
          });

          const m = row.FECHA ? row.FECHA.match(/(\d{2})\/(\d{2})\/(\d{2})/) : null;
          if (!m) continue;
          const dateKey = `20${m[3]}-${m[2]}-${m[1]}`;
          const tot = parseFloat(row.TOTAL) || 0;
          if (tot > 0) {
            conceptRecords[dateKey] = {
              sourceFile: path.basename(fp),
              rawDate: row.FECHA,
              total: tot,
              tickets: parseInt(row.VENTAS, 10) || 0,
              cub: parseInt(row.CUB, 10) || 0,
              salon: parseFloat(row.SALON) || 0,
              mostrador: parseFloat(row.MOSTRADOR) || 0,
              domicilio: parseFloat(row.DOMICILIO) || 0,
              otros: parseFloat(row.OTROS) || 0,
              promedioCub: parseFloat(row.PROMEDIO) || 0,
              promVtas: parseFloat(row.PROM_VTAS) || 0
            };
          }
        }
      }
    } catch (e) {}
  }

  console.log(`[2] Fechas identificadas en tablas oficiales de concepto: ${Object.keys(conceptRecords).length}`);

  // 3. Identificar tablas detalladas de mozos, rubros y platos
  const detailedRecords = {};
  for (const fp of files) {
    try {
      const buf = fs.readFileSync(fp);
      const head = parseDbfHeader(buf);
      if (!head) continue;
      const fn = head.fields.map(f => f.name.toUpperCase());
      if (fn.includes('MOZO') && fn.includes('TOTAL') && fn.includes('FECHA') && fn.includes('NOMBRUA')) {
        auditLog.detailedDbfs.push({ path: fp, records: head.numRecords });

        let curOff = 1;
        let fechaOff = -1, fechaLen = 0;
        let compOff = -1, compLen = 0;
        let mozoOff = -1, mozoLen = 0;
        let nomMozoOff = -1, nomMozoLen = 0;
        let nomRuaOff = -1, nomRuaLen = 0;
        let nomArtOff = -1, nomArtLen = 0;
        let cantOff = -1, cantLen = 0;
        let punitOff = -1, punitLen = 0;
        let totalOff = -1, totalLen = 0;
        let horaOff = -1, horaLen = 0;

        for (const f of head.fields) {
          const name = f.name.toUpperCase();
          if (name === 'FECHA') { fechaOff = curOff; fechaLen = f.len; }
          else if (name === 'HORA') { horaOff = curOff; horaLen = f.len; }
          else if (name === 'COMPROBANT' || name === 'COMPROB') { compOff = curOff; compLen = f.len; }
          else if (name === 'MOZO' || name === 'COD_MOZ') { mozoOff = curOff; mozoLen = f.len; }
          else if (name === 'NOMBREMOZ') { nomMozoOff = curOff; nomMozoLen = f.len; }
          else if (name === 'NOMBRUA' || name === 'NOMRUB') { nomRuaOff = curOff; nomRuaLen = f.len; }
          else if (name === 'NOMBREART' || name === 'NOMART') { nomArtOff = curOff; nomArtLen = f.len; }
          else if (name === 'CANTIDAD') { cantOff = curOff; cantLen = f.len; }
          else if (name === 'PUNIT' || name === 'PRECIO') { punitOff = curOff; punitLen = f.len; }
          else if (name === 'TOTAL') { totalOff = curOff; totalLen = f.len; }
          curOff += f.len;
        }

        const fileDays = {};
        for (let r = 0; r < head.numRecords; r++) {
          const recOff = head.headerLen + r * head.recordLen;
          if (recOff + head.recordLen > buf.length || buf[recOff] === 0x2A) continue;

          let recDateKey = null;
          if (fechaOff !== -1) {
            const rawD = buf.slice(recOff + fechaOff, recOff + fechaOff + fechaLen).toString('ascii').trim();
            if (rawD.length === 8 && /^\d{8}$/.test(rawD)) {
              recDateKey = `${rawD.slice(0,4)}-${rawD.slice(4,6)}-${rawD.slice(6,8)}`;
            }
          }
          if (!recDateKey) continue;

          if (!fileDays[recDateKey]) {
            fileDays[recDateKey] = {
              sourceFile: path.basename(fp),
              grandTot: 0,
              rubros: {},
              mozos: {},
              productos: {},
              horarios: {}
            };
          }

          const dObj = fileDays[recDateKey];
          const tot = totalOff !== -1 ? (parseFloat(buf.slice(recOff + totalOff, recOff + totalOff + totalLen).toString('ascii').trim()) || 0) : 0;
          const cant = cantOff !== -1 ? (parseFloat(buf.slice(recOff + cantOff, recOff + cantOff + cantLen).toString('ascii').trim()) || 0) : 0;
          const nomRua = nomRuaOff !== -1 ? buf.slice(recOff + nomRuaOff, recOff + nomRuaOff + nomRuaLen).toString('latin1').trim() : '';
          const nomArt = nomArtOff !== -1 ? buf.slice(recOff + nomArtOff, recOff + nomArtOff + nomArtLen).toString('latin1').trim() : '';
          const codMoz = mozoOff !== -1 ? (parseInt(buf.slice(recOff + mozoOff, recOff + mozoOff + mozoLen).toString('ascii').trim(), 10) || 0) : 0;
          const nomMoz = nomMozoOff !== -1 ? buf.slice(recOff + nomMozoOff, recOff + nomMozoOff + nomMozoLen).toString('latin1').trim() : '';
          const horaStr = horaOff !== -1 ? buf.slice(recOff + horaOff, recOff + horaOff + horaLen).toString('ascii').trim() : '';

          if (nomRua) dObj.rubros[nomRua] = (dObj.rubros[nomRua] || 0) + tot;
          if (nomArt && !nomArt.toUpperCase().includes('CUBIERTO')) {
            dObj.productos[nomArt] = dObj.productos[nomArt] || { unidades: 0, total: 0 };
            dObj.productos[nomArt].unidades += cant;
            dObj.productos[nomArt].total += tot;
          }
          if (codMoz > 0) {
            dObj.mozos[codMoz] = dObj.mozos[codMoz] || { nombre: nomMoz, total: 0, cubiertos: 0 };
            dObj.mozos[codMoz].total += tot;
            if (nomArt.toUpperCase().includes('CUBIERTO')) dObj.mozos[codMoz].cubiertos += Math.round(cant);
          }
          if (horaStr) {
            const hh = horaStr.split(':')[0] + ':00';
            dObj.horarios[hh] = (dObj.horarios[hh] || 0) + tot;
          }
          dObj.grandTot += tot;
        }

        // Guardar por fecha si es más completo o prioritario
        for (const [dk, dData] of Object.entries(fileDays)) {
          if (!detailedRecords[dk] || (dData.sourceFile.startsWith('42') || dData.sourceFile.startsWith('39') || dData.sourceFile === 'Informe.DBF')) {
            detailedRecords[dk] = dData;
          }
        }
      }
    } catch (e) {}
  }

  console.log(`[3] Fechas con tablas detalladas de mozos/rubros: ${Object.keys(detailedRecords).length}`);

  // 4. Comparar contra API en vivo de MaxiProtocol
  console.log('\n[4] Comparando datos API vs Tablas Físicas de Maxirest:');
  const daysToCheck = ['2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12', '2026-10-11', '2026-10-10', '2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01'];

  for (const dateKey of daysToCheck) {
    const rawConcept = conceptRecords[dateKey];
    const rawDetail = detailedRecords[dateKey];
    const apiRes = await fetchApi(`/api/analytics/day?date=${dateKey}`);
    const apiData = apiRes.data;

    const dayAudit = {
      date: dateKey,
      hasRawConcept: !!rawConcept,
      hasRawDetail: !!rawDetail,
      checks: []
    };

    if (!apiData || !apiData.kpis) {
      dayAudit.checks.push({ status: 'ERROR', message: 'API no devolvió datos para la fecha' });
      auditLog.daysAudited[dateKey] = dayAudit;
      continue;
    }

    // A. Check Facturación
    if (rawConcept) {
      const diffFact = Math.abs(apiData.kpis.facturacionTotal - rawConcept.total);
      if (diffFact === 0) {
        dayAudit.checks.push({ field: 'facturacion', status: 'MATCH_EXACT', value: apiData.kpis.facturacionTotal, raw: rawConcept.total });
      } else {
        dayAudit.checks.push({ field: 'facturacion', status: 'MISMATCH', value: apiData.kpis.facturacionTotal, raw: rawConcept.total, diff: diffFact });
        auditLog.discrepancies.push({ date: dateKey, field: 'facturacion', api: apiData.kpis.facturacionTotal, raw: rawConcept.total });
      }

      // B. Check Tickets
      const diffTks = Math.abs(apiData.kpis.totalTickets - rawConcept.tickets);
      if (diffTks === 0) {
        dayAudit.checks.push({ field: 'tickets', status: 'MATCH_EXACT', value: apiData.kpis.totalTickets, raw: rawConcept.tickets });
      } else {
        dayAudit.checks.push({ field: 'tickets', status: 'MISMATCH', value: apiData.kpis.totalTickets, raw: rawConcept.tickets, diff: diffTks });
        auditLog.discrepancies.push({ date: dateKey, field: 'tickets', api: apiData.kpis.totalTickets, raw: rawConcept.tickets });
      }

      // C. Check Cubiertos (CUB)
      const diffCub = Math.abs(apiData.kpis.totalComensales - rawConcept.cub);
      if (diffCub === 0) {
        dayAudit.checks.push({ field: 'cubiertos', status: 'MATCH_EXACT', value: apiData.kpis.totalComensales, raw: rawConcept.cub });
      } else {
        dayAudit.checks.push({ field: 'cubiertos', status: 'MISMATCH', value: apiData.kpis.totalComensales, raw: rawConcept.cub, diff: diffCub });
        auditLog.discrepancies.push({ date: dateKey, field: 'cubiertos', api: apiData.kpis.totalComensales, raw: rawConcept.cub });
      }

      // D. Check Canales
      if (apiData.kpis.canales) {
        const diffSalon = Math.abs((apiData.kpis.canales.salon || 0) - rawConcept.salon);
        const diffMostrador = Math.abs((apiData.kpis.canales.mostrador || 0) - rawConcept.mostrador);
        const diffDom = Math.abs((apiData.kpis.canales.domicilio || 0) - rawConcept.domicilio);
        if (diffSalon < 1 && diffMostrador < 1 && diffDom < 1) {
          dayAudit.checks.push({ field: 'canales', status: 'MATCH_EXACT', api: apiData.kpis.canales, raw: { salon: rawConcept.salon, mostrador: rawConcept.mostrador, domicilio: rawConcept.domicilio } });
        } else {
          dayAudit.checks.push({ field: 'canales', status: 'MISMATCH', api: apiData.kpis.canales, raw: { salon: rawConcept.salon, mostrador: rawConcept.mostrador, domicilio: rawConcept.domicilio } });
          auditLog.discrepancies.push({ date: dateKey, field: 'canales', api: apiData.kpis.canales, raw: { salon: rawConcept.salon, mostrador: rawConcept.mostrador, domicilio: rawConcept.domicilio } });
        }
      }
    } else {
      dayAudit.checks.push({ field: 'conceptReport', status: 'NO_RAW_CONCEPT_REPORT', message: 'No hay reporte de conceptos emitido en POS para esta fecha' });
    }

    // E. Check Rubros
    if (rawDetail) {
      const apiRubros = apiData.ventasPorRubro || {};
      let rubrosMatch = true;
      for (const [rName, rVal] of Object.entries(rawDetail.rubros)) {
        const apiVal = apiRubros[rName] || 0;
        if (Math.abs(apiVal - rVal) > 1) {
          rubrosMatch = false;
          auditLog.discrepancies.push({ date: dateKey, field: `rubro_${rName}`, api: apiVal, raw: rVal });
        }
      }
      dayAudit.checks.push({ field: 'rubros', status: rubrosMatch ? 'MATCH_EXACT' : 'MISMATCH', rawRubros: rawDetail.rubros, apiRubros });
    } else {
      // Si no hay reporte detallado, ventasPorRubro DEBE estar vacío {}
      const apiRubros = apiData.ventasPorRubro || {};
      const isEmpty = Object.keys(apiRubros).length === 0;
      if (!isEmpty) {
        dayAudit.checks.push({ field: 'rubros_unemitted', status: 'SYNTHETIC_DATA_DETECTED', count: Object.keys(apiRubros).length });
        auditLog.discrepancies.push({ date: dateKey, field: 'rubros', issue: 'Datos presentes cuando no existe informe emitido' });
      } else {
        dayAudit.checks.push({ field: 'rubros_unemitted', status: 'CLEAN_EMPTY_STATE' });
      }
    }

    // F. Check Mozos
    if (rawDetail) {
      const apiMozos = apiData.mozos || [];
      const auditedTotal = Object.values(rawDetail.mozos).reduce((s, m) => s + m.total, 0);
      const apiMozosTotal = apiMozos.reduce((s, m) => s + (m.ventas || 0), 0);
      if (Math.abs(auditedTotal - apiMozosTotal) < 5) {
        dayAudit.checks.push({ field: 'mozos_total', status: 'MATCH_EXACT', api: apiMozosTotal, raw: auditedTotal });
      } else {
        dayAudit.checks.push({ field: 'mozos_total', status: 'MISMATCH', api: apiMozosTotal, raw: auditedTotal });
        auditLog.discrepancies.push({ date: dateKey, field: 'mozos_total', api: apiMozosTotal, raw: auditedTotal });
      }
    }

    auditLog.daysAudited[dateKey] = dayAudit;
    const errors = dayAudit.checks.filter(c => c.status === 'MISMATCH' || c.status === 'SYNTHETIC_DATA_DETECTED');
    console.log(`- [${dateKey}] Fact: $${apiData.kpis.facturacionTotal.toLocaleString()} | Tks: ${apiData.kpis.totalTickets} | Cub: ${apiData.kpis.totalComensales} -> ${errors.length === 0 ? '✅ 100% EXACTO' : `⚠️ ${errors.length} DISCREPANCIAS`}`);
  }

  // Guardar log completo
  const logPath = path.join(__dirname, '..', 'audit_log_complete.json');
  fs.writeFileSync(logPath, JSON.stringify(auditLog, null, 2), 'utf8');
  console.log(`\n💾 Log completo de auditoría guardado en: ${logPath}`);
  console.log(`Total discrepancias detectadas: ${auditLog.discrepancies.length}`);
}

runAudit().catch(console.error);
