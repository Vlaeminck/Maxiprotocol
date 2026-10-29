/**
 * MaxiProtocol - Catálogo Maestro Dinámico de Categorías (Rubros) y Subcategorías (Subrubros)
 * Sincroniza 1:1 con los reportes oficiales de Maxirest POS:
 * - C:\MaxiRest\Informe.DBF / 55181107.dbf / 34417329.dbf / etc. (Reporte "Ventas por artículo / ranking")
 * - C:\Users\Gardenias\Desktop\todos los rubros actualizados.xls / todos los rubros.xls / ajuste rubro paste.xls
 */

const fs = require('fs');
const path = require('path');

const CATALOG_CACHE_PATH = path.join(__dirname, '..', 'config', 'categories_catalog.json');

class CategoriesCatalog {
  constructor(maxirestPath = 'C:\\MaxiRest') {
    this.maxirestPath = maxirestPath;
    this.byCode = {};
    this.byName = {};
    this.rubrosMap = {};
    this.subrubrosMap = {};
    this.latestRankingItems = [];
    this.latestSourceFile = null;
    this.latestSourceTime = 0;
    this.reload();
  }

  normalizeCode(raw) {
    if (raw === null || raw === undefined) return '';
    const s = String(raw).trim();
    if (!s) return '';
    const n = parseInt(s, 10);
    if (!isNaN(n) && String(n) === s.replace(/^0+/, '')) {
      return String(n);
    }
    return s.toUpperCase();
  }

  normalizeName(raw) {
    if (!raw) return '';
    return String(raw)
      .trim()
      .toUpperCase()
      .replace(/^[-\s]+/, '')
      .replace(/\s+/g, ' ');
  }

  cleanRubroName(rawRubro, cod = '') {
    const r = String(rawRubro || '').trim().toUpperCase();
    if (!r || r === '0' || r === 'SIN RUBRO') {
      if (cod === '0') return 'RUBRO. INEXISTENTE';
      return '';
    }
    if (r === 'ALMUERZO CENA') return 'ALMUERZO CENA DESAYUNO';
    return r;
  }

  cleanSubrubroName(rawSubrubro) {
    const s = String(rawSubrubro || '').trim().toUpperCase();
    if (!s || s === '0' || s.includes('INEXISTENTE') || s === 'SIN SUBRUBRO') {
      return '';
    }
    return s;
  }

  /**
   * Lee un archivo DBF si corresponde a la estructura de "Ventas por artículo / ranking"
   * Campos: ID, RUBRO, NOMRUB, SUBRUBRO, NOMSUB, CODIGO, NOMBRE, UNIDADES, PRECIO, VENTA
   */
  readRankingDbf(filePath) {
    if (!fs.existsSync(filePath)) return null;
    let fd;
    try {
      fd = fs.openSync(filePath, 'r');
      const h = Buffer.alloc(32);
      fs.readSync(fd, h, 0, 32, 0);
      const numRecords = h.readUInt32LE(4);
      const headerLen = h.readUInt16LE(8);
      const recordLen = h.readUInt16LE(10);
      if (headerLen < 32 || headerLen > 10000 || recordLen < 1 || numRecords === 0) {
        fs.closeSync(fd);
        return null;
      }

      const fBuf = Buffer.alloc(headerLen - 32);
      fs.readSync(fd, fBuf, 0, headerLen - 32, 32);
      const fields = [];
      for (let o = 0; o + 32 <= fBuf.length; o += 32) {
        if (fBuf[o] === 0x0D) break;
        fields.push({
          name: fBuf.toString('ascii', o, o + 11).replace(/\0/g, '').trim().toUpperCase(),
          len: fBuf[o + 16]
        });
      }

      const fieldNames = fields.map(f => f.name);
      const isRankingDbf = fieldNames.includes('RUBRO') &&
                           fieldNames.includes('NOMRUB') &&
                           fieldNames.includes('CODIGO') &&
                           fieldNames.includes('NOMBRE') &&
                           fieldNames.includes('VENTA');
      if (!isRankingDbf) {
        fs.closeSync(fd);
        return null;
      }

      const recBuf = Buffer.alloc(recordLen);
      const items = [];
      for (let r = 0; r < numRecords; r++) {
        fs.readSync(fd, recBuf, 0, recordLen, headerLen + r * recordLen);
        if (recBuf[0] === 0x2A) continue;
        let cur = 1;
        const row = {};
        for (const f of fields) {
          row[f.name] = recBuf.toString('latin1', cur, cur + f.len).trim();
          cur += f.len;
        }
        const codigo = this.normalizeCode(row.CODIGO);
        const nombre = (row.NOMBRE || '').trim();
        const rubroId = String(row.RUBRO || '0').trim();
        const rubro = this.cleanRubroName(row.NOMRUB, codigo);
        const subrubroId = String(row.SUBRUBRO || '0').trim();
        const subrubro = this.cleanSubrubroName(row.NOMSUB);
        const unidades = parseFloat(row.UNIDADES) || 0;
        const precio = parseFloat(row.PRECIO) || 0;
        const venta = parseFloat(row.VENTA) || 0;

        items.push({
          codigo,
          nombre,
          rubroId,
          rubro: rubro || (codigo === '0' ? 'RUBRO. INEXISTENTE' : 'ALMUERZO CENA DESAYUNO'),
          subrubroId: subrubro ? subrubroId : '0',
          subrubro,
          unidades,
          precio: precio > 0 ? precio : (unidades > 0 ? Math.round(venta / unidades) : 0),
          venta
        });
      }
      fs.closeSync(fd);
      const st = fs.statSync(filePath);
      return {
        file: path.basename(filePath),
        fullPath: filePath,
        mtimeMs: st.mtimeMs,
        items
      };
    } catch (e) {
      if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
      return null;
    }
  }

  /**
   * Recarga el catálogo desde todos los archivos DBF de ranking y el caché JSON (actualizado por XLS)
   */
  reload() {
    this.byCode = {};
    this.byName = {};
    this.rubrosMap = {};
    this.subrubrosMap = {};
    this.latestRankingItems = [];

    const sources = [];

    // 1. Escanear DBFs en C:\MaxiRest
    if (fs.existsSync(this.maxirestPath)) {
      try {
        const files = fs.readdirSync(this.maxirestPath).filter(f => f.toLowerCase().endsWith('.dbf'));
        for (const f of files) {
          const full = path.join(this.maxirestPath, f);
          try {
            const st = fs.statSync(full);
            // Los reportes de ranking suelen pesar entre 500 bytes y 300 KB
            if (st.size >= 500 && st.size <= 350000) {
              const parsed = this.readRankingDbf(full);
              if (parsed && parsed.items.length > 0) {
                sources.push(parsed);
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 2. Si existe config/categories_catalog.json (alimentado también por import_desktop_xls.py)
    if (fs.existsSync(CATALOG_CACHE_PATH)) {
      try {
        const cached = JSON.parse(fs.readFileSync(CATALOG_CACHE_PATH, 'utf8'));
        if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
          sources.push({
            file: cached.sourceFile || 'categories_catalog.json',
            fullPath: CATALOG_CACHE_PATH,
            mtimeMs: cached.sourceMtimeMs || 0,
            items: cached.items
          });
        }
      } catch (_) {}
    }

    // Ordenar de más antiguo a más reciente para que el último reporte (ej. Informe.DBF / todos los rubros actualizados.xls) pise a los anteriores
    sources.sort((a, b) => a.mtimeMs - b.mtimeMs);

    let bestComprehensiveSource = null;

    for (const src of sources) {
      if (src.items.length >= 200) {
        bestComprehensiveSource = src;
      }
      for (const item of src.items) {
        if (!item.codigo && !item.nombre) continue;
        const entry = {
          codigo: item.codigo,
          nombre: item.nombre,
          rubroId: item.rubroId || '0',
          rubro: this.cleanRubroName(item.rubro, item.codigo) || 'ALMUERZO CENA DESAYUNO',
          subrubroId: item.subrubro ? (item.subrubroId || '1') : '0',
          subrubro: this.cleanSubrubroName(item.subrubro),
          unidades: item.unidades || 0,
          precio: item.precio || 0,
          venta: item.venta || 0
        };

        if (entry.codigo) {
          const prev = this.byCode[entry.codigo];
          // Si el registro nuevo no tiene subrubro pero un archivo más reciente o igual ya le asignó subrubro, conservar si corresponde
          this.byCode[entry.codigo] = {
            ...entry,
            subrubro: entry.subrubro || (prev && prev.rubro === entry.rubro ? prev.subrubro : ''),
            subrubroId: entry.subrubro ? entry.subrubroId : (prev && prev.rubro === entry.rubro ? prev.subrubroId : '0')
          };
        }

        const normN = this.normalizeName(entry.nombre);
        if (normN) {
          const prevN = this.byName[normN];
          this.byName[normN] = {
            ...entry,
            subrubro: entry.subrubro || (prevN && prevN.rubro === entry.rubro ? prevN.subrubro : ''),
            subrubroId: entry.subrubro ? entry.subrubroId : (prevN && prevN.rubro === entry.rubro ? prevN.subrubroId : '0')
          };
        }
      }
    }

    if (!bestComprehensiveSource && sources.length > 0) {
      bestComprehensiveSource = sources[sources.length - 1];
    }

    if (bestComprehensiveSource) {
      this.latestSourceFile = bestComprehensiveSource.file;
      this.latestSourceTime = bestComprehensiveSource.mtimeMs;
      // Enriquecer cada ítem del reporte integral con la última clasificación consolidada
      this.latestRankingItems = bestComprehensiveSource.items.map(it => {
        const latest = this.byCode[it.codigo] || this.byName[this.normalizeName(it.nombre)] || it;
        return {
          ...it,
          rubro: latest.rubro,
          rubroId: latest.rubroId,
          subrubro: latest.subrubro || '',
          subrubroId: latest.subrubroId || '0'
        };
      });
    }

    // Construir mapa de rubros y subrubros activos
    const itemsForSummary = this.latestRankingItems.length > 0
      ? this.latestRankingItems
      : Object.values(this.byCode);

    let totalVentaCatalog = 0;
    for (const it of itemsForSummary) {
      if (it.codigo === '0' || it.nombre.toUpperCase().includes('INEXISTENTE')) continue;
      if (it.codigo === '4031' || it.nombre.toUpperCase().includes('CUBIERTO')) continue;
      const rub = it.rubro || 'ALMUERZO CENA DESAYUNO';
      const sub = it.subrubro || '';
      const v = it.venta || 0;
      const u = it.unidades || 0;
      totalVentaCatalog += v;

      if (!this.rubrosMap[rub]) {
        this.rubrosMap[rub] = {
          rubro: rub,
          rubroId: it.rubroId || '0',
          articulosCount: 0,
          unidades: 0,
          venta: 0,
          share: 0,
          subrubros: {}
        };
      }
      this.rubrosMap[rub].articulosCount++;
      this.rubrosMap[rub].unidades += u;
      this.rubrosMap[rub].venta += v;

      if (sub) {
        if (!this.rubrosMap[rub].subrubros[sub]) {
          this.rubrosMap[rub].subrubros[sub] = {
            subrubro: sub,
            subrubroId: it.subrubroId || '1',
            rubroPadre: rub,
            articulosCount: 0,
            unidades: 0,
            venta: 0
          };
        }
        this.rubrosMap[rub].subrubros[sub].articulosCount++;
        this.rubrosMap[rub].subrubros[sub].unidades += u;
        this.rubrosMap[rub].subrubros[sub].venta += v;

        if (!this.subrubrosMap[sub]) {
          this.subrubrosMap[sub] = {
            subrubro: sub,
            subrubroId: it.subrubroId || '1',
            rubroPadre: rub,
            articulosCount: 0,
            unidades: 0,
            venta: 0
          };
        }
        this.subrubrosMap[sub].articulosCount++;
        this.subrubrosMap[sub].unidades += u;
        this.subrubrosMap[sub].venta += v;
      }
    }

    for (const rObj of Object.values(this.rubrosMap)) {
      rObj.share = totalVentaCatalog > 0 ? (rObj.venta / totalVentaCatalog) : 0;
    }

    // Persistir en config/categories_catalog.json si tenemos datos frescos de DBF
    if (this.latestRankingItems.length > 0) {
      try {
        fs.writeFileSync(CATALOG_CACHE_PATH, JSON.stringify({
          updatedAt: new Date().toISOString(),
          sourceFile: this.latestSourceFile,
          sourceMtimeMs: this.latestSourceTime,
          totalArticles: Object.keys(this.byCode).length,
          rubros: Object.values(this.rubrosMap).sort((a, b) => b.venta - a.venta),
          subrubros: Object.values(this.subrubrosMap).sort((a, b) => b.venta - a.venta),
          items: this.latestRankingItems
        }, null, 2), 'utf8');
      } catch (_) {}
    }

    return {
      totalArticles: Object.keys(this.byCode).length,
      rubrosCount: Object.keys(this.rubrosMap).length,
      subrubrosCount: Object.keys(this.subrubrosMap).length,
      sourceFile: this.latestSourceFile
    };
  }

  /**
   * Resuelve la Categoría (Rubro) y Subcategoría (Subrubro) oficial actualizada para cualquier artículo
   */
  resolveArticle(codigo, nombre, fallbackRubro = '', fallbackSubrubro = '') {
    const cleanCod = this.normalizeCode(codigo);
    const cleanNom = this.normalizeName(nombre);

    // 1. Búsqueda exacta por código de artículo en el catálogo actualizado
    if (cleanCod && this.byCode[cleanCod]) {
      const hit = this.byCode[cleanCod];
      return {
        codigo: hit.codigo,
        nombre: hit.nombre || nombre,
        rubro: hit.rubro,
        subrubro: hit.subrubro || this.cleanSubrubroName(fallbackSubrubro) || ''
      };
    }

    // 2. Búsqueda exacta por nombre normalizado
    if (cleanNom && this.byName[cleanNom]) {
      const hit = this.byName[cleanNom];
      return {
        codigo: cleanCod || hit.codigo,
        nombre: nombre || hit.nombre,
        rubro: hit.rubro,
        subrubro: hit.subrubro || this.cleanSubrubroName(fallbackSubrubro) || ''
      };
    }

    // 3. Búsqueda parcial por prefijo (para nombres truncados a 30 chars en DBFs antiguos)
    if (cleanNom && cleanNom.length >= 6) {
      const prefix = cleanNom.slice(0, 18);
      for (const [kNom, val] of Object.entries(this.byName)) {
        if (kNom.startsWith(prefix) || prefix.startsWith(kNom.slice(0, 18))) {
          return {
            codigo: cleanCod || val.codigo,
            nombre: nombre || val.nombre,
            rubro: val.rubro,
            subrubro: val.subrubro || this.cleanSubrubroName(fallbackSubrubro) || ''
          };
        }
      }
    }

    // 4. Fallback normalizando nombres de rubros actualizados
    let rub = this.cleanRubroName(fallbackRubro, cleanCod);
    let sub = this.cleanSubrubroName(fallbackSubrubro);

    if (!rub) {
      rub = this.inferRubroByRules(cleanNom);
    }
    if (!sub && this.inferSubrubroDesayuno(cleanNom)) {
      sub = 'DESAYUNO';
    }

    return {
      codigo: cleanCod || 'ART',
      nombre: nombre || 'Artículo',
      rubro: rub,
      subrubro: sub
    };
  }

  inferSubrubroDesayuno(cleanNom) {
    if (!cleanNom) return false;
    return (
      cleanNom.includes('AMELIA QUERIDA') ||
      cleanNom.includes('SARA DE LEJOS') ||
      cleanNom.includes('ALEGRE AGUSTIN') ||
      cleanNom.includes('ALEGRE AGUSTÍN') ||
      cleanNom.includes('FRENCH TOAST')
    );
  }

  inferRubroByRules(cleanNom) {
    const n = (cleanNom || '').toUpperCase();
    if (
      n.includes('AMELIA QUERIDA') ||
      n.includes('SARA DE LEJOS') ||
      n.includes('ALEGRE AGUSTIN') ||
      n.includes('ALEGRE AGUSTÍN') ||
      n.includes('FRENCH TOAST') ||
      n.includes('GDS COMPARTE') ||
      n.includes('PARA ANA CON AMOR') ||
      n.includes('ROSA ROSA') ||
      n.includes('ADORADO FRAN') ||
      n.includes('ELSITA') ||
      n.includes('AMADO JOAQUIN') ||
      n.includes('DIVINA LUCIA') ||
      n.includes('UN CLAVEL') ||
      n.includes('SCON') ||
      n.includes('TOSTADO') ||
      n.includes('TOSTADAS CON DIPS') ||
      n.includes('YOGUR CON FRUTAS') ||
      n.includes('SAND. MIGA')
    ) {
      return 'ALMUERZO CENA DESAYUNO';
    }
    if (n.includes('CREME BRULEE') || n.includes('FLAN') || n.includes('VOLCAN') || n.includes('CRUMBLE') || n.includes('COPA HELADO') || n.includes('COPA MOUSSE') || n.includes('FRUTILLAS CON CREMA')) {
      return 'POSTRES';
    }
    if (n.includes('BOX PARA MAMA') || n.includes('GRANOLA') || n.includes('MERMELADA') || n.includes('MIEL') || n.includes('DIFUSOR') || n.includes('SPRAY') || n.includes('VELA') || n.includes('TAZAS')) {
      return 'MARKET';
    }
    if (n.includes('CAFE - DOBLE CON CREMA') || n.includes('SUBMARINO NUTELLA') || n.includes('NESSPRESO') || n.includes('NESPRESSO') || n.includes('CHOCOLATADA') || n.includes('CAFE CORTESIA')) {
      return 'CAFETERIA';
    }
    if (n.includes('AGUA CON GAS - BRUNCH') || n.includes('AGUA SIN GAS - BRUNCH')) {
      return 'AGUA';
    }
    if (n.includes('ATENCION DE CUMPLEA')) {
      return 'DESCUENTOS - PROMOS';
    }
    if (n.includes('CAFE') || n.includes('CAFÉ') || n.includes('LATTE') || n.includes('CORTADO') || n.includes('ESPRESSO') || n.includes('RISTRETTO') || n.includes('LAGRIMA') || n.includes('CAPPU') || n.includes('SUBMARINO') || n.includes('TE -') || n.includes('ICED ') || n.includes('AGUA') || n.includes('LIMONADA') || n.includes('POMELADA') || n.includes('EXPRIMIDO') || n.includes('MOCKTEL') || n.includes('FROZZEN') || n.includes('LEVITE') || n.includes('VINO') || n.includes('SALENTEIN') || n.includes('CORONA') || n.includes('STELLA ARTOIS') || n.includes('APEROL') || n.includes('CAMPARI') || n.includes('NEGRONI') || n.includes('GASEOSA')) {
      return 'BEBIDAS';
    }
    if (n.includes('MEDIALUNA') || n.includes('VINNOISERIE') || n.includes('CHIPA') || n.includes('BUDIN') || n.includes('BUDÍN') || n.includes('FROLA') || n.includes('MASAS') || n.includes('ALFAJOR') || n.includes('TARTA') || n.includes('TIRAMISU') || n.includes('BROWNIE') || n.includes('COOKIE') || n.includes('TORTA') || n.includes('MINI CAKE')) {
      return 'PASTELERIA';
    }
    if (n.includes('CAJA ') || n.includes('BOX')) {
      return 'BOX GDS';
    }
    if (n.includes('ADICIONAL') || n.includes('CUBIERTO') || n.includes('SERVICIO DE MESA') || n.includes('HIELERA') || n.includes('SEÑA') || n.includes('GIFT CARD')) {
      return 'ADICIONALES';
    }
    return 'ALMUERZO CENA DESAYUNO';
  }

  get latestRankingSource() {
    return this.latestSourceFile;
  }

  get latestRankingMtime() {
    return this.latestSourceTime ? new Date(this.latestSourceTime).toISOString() : null;
  }

  getActiveRubrosList() {
    return Object.values(this.rubrosMap).sort((a, b) => b.venta - a.venta);
  }

  getActiveCategoriesList() {
    return this.getActiveRubrosList();
  }

  getActiveSubrubrosList() {
    return Object.values(this.subrubrosMap).sort((a, b) => b.venta - a.venta);
  }

  getActiveSubcategoriesList() {
    return this.getActiveSubrubrosList();
  }
}

const singletonCatalog = new CategoriesCatalog();

module.exports = {
  CategoriesCatalog,
  categoriesCatalog: singletonCatalog
};
