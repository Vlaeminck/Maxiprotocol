const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'LOG_INCIDENCIAS_MOZOS_Y_PLATOS.md');
let content = fs.readFileSync(target, 'utf8').trimEnd();

const section9 = `

---

## 🎖️ 9. Precisión Crítica en Ventas por Empleado & Desglose de Cubiertos (Maxirest POS 10783)

### 9.1. Incidencia Crítica Reportada
* **Problema:** En el portal analítico los datos de "Rendimiento de Equipo (Mozos)" no coincidían con el informe oficial de Maxirest POS *"Ventas por empleado"*.
  - Para el día \`14/10/2026\`:
    * El dashboard mostraba mozos simulados (Rocío $288.083, Belén $262.663, Marina $245.717, Brenda $93.203) generados por un ponderador heurístico (\`weightShare\`).
    * El pill superior mostraba facturación errónea de \`$1.11M\` y \`156 Cub\` calculados por una estimación \`tickets * 1.31\`.
  - **Requisito del Usuario:** Las ventas por empleado y los cubiertos son información crítica de auditoría y comisiones que debe coincidir con Maxirest POS al centavo y al comensal exacto.

### 9.2. Análisis Forense & Causa Raíz
1. **Volcado Dinámico de Informes en Maxirest POS:**
   - Cuando el usuario ejecuta o visualiza *"Ventas por empleado"* en Maxirest POS (como se aprecia en la captura oficial de las 09:24 hs del 15/10/26), el sistema Delphi/FoxPro genera una tabla DBF temporal numerada en \`C:\\MaxiRest\\\` (\`33841499.dbf\` a las 09:24 hs y \`35371505.dbf\` a las 09:49 hs) y la copia transitoriamente a \`C:\\MaxiREST_SQL\\bakinforme.dbf\`.
   - Cuando posteriormente se emite el informe de formas de cobro / arqueo de caja, Maxirest genera \`32624456.dbf\` / \`35378568.dbf\` y sobreescribe \`bakinforme.dbf\`.
2. **Limitación del Parser Previo:**
   - \`readBakinformeClosure()\` buscaba estrictamente columnas \`ID, NOMBRE, IMPORTE\` donde \`NOMBRE === 'TOTAL'\`. Al recibir el archivo de mozos (\`CODIGO, NOMBRE, IMPORTE, VENTAS, CUBIERTOS\`), fallaba y caía en un fallback estático obsoleto (\`29726806.dbf\` con $1.11M).
   - \`generateMozosForDay\` aplicaba multiplicación porcentual sintética (\`weightShare\`) inventando ventas para colaboradores que no habían trabajado en esa fecha (ej. Rocío y Brenda).

### 9.3. Solución de Ingeniería Implementada
1. **Parser Polimórfico de DBF (\`parseMozoDbf\` y \`parseClosureDbf\`):**
   - Se implementó detección automática por esquema de campos en \`extractor/maxirest_analytics.js\`:
     * **Informe de Mozos:** Detecta \`CODIGO, NOMBRE, IMPORTE, VENTAS, CUBIERTOS, PROM_CUB, ANULAC, IMP_ANU\`. Extrae ventas exactas, comprobantes y cubiertos (CUB) por mozo.
     * **Informe de Cierre / Formas de Pago:** Detecta \`ID, CODIGO, NOMBRE, IMPORTE, VENTAS, PORCENTAJE\`. Extrae facturación neta total ($3.019.960) y formas de pago oficiales (NAVE $1.680.650, Efectivo $1.090.310, Mercado Pago $164.000, PedidosYa $62.000, Cta Cte $23.000).
2. **Cero Simulación / Cero Estimación:**
   - Se erradicó por completo el cálculo sintético de mozos y la fórmula heurística \`tickets * 1.31\`.
   - Si una fecha cuenta con informe auditado (\`config/mozos_daily_audit.json\` o escaneo directo de Maxirest DBF), se inyectan las cifras exactas.
   - Si una fecha histórica no cuenta con informe emitido en Maxirest POS, se presenta con \`$0\` y la leyenda transparente *"Sin informe de mozos emitido en Maxirest POS para este turno"*.
3. **Persistencia & Sincronización Automática:**
   - Archivo de verdad auditada: \`config/mozos_daily_audit.json\`.
   - Nuevo endpoint de API: \`POST /api/mozos/sync-maxirest?date=YYYY-MM-DD\`.
   - El botón **"Sincronizar Personal"** en la UI ahora dispara la sincronización directa contra los DBFs de Maxirest para la fecha seleccionada.
4. **Registro Completo de Estaciones de Trabajo:**
   - Se incorporó la estación \`500 MARKET\` (Mostrador / Tienda) al registro oficial \`config/staff_registry.json\`.

### 9.4. Resultados Oficiales Verificados (14/10/2026)

| Código | Colaborador / Estación | Facturación Neta | Tickets | Cubiertos (CUB) | Ticket Promedio | Prom. por Cubierto | Estado Turno |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **984** | **BELEN** | **$972.210,00** | 29 | **51 cub** | $33.524,48 | $18.200,20 | En Turno |
| **500** | **MARKET** *(Tienda)* | **$772.390,00** | 27 | **0 cub** | $28.607,04 | $0,00 | En Turno |
| **315** | **MARINA** | **$692.480,00** | 17 | **36 cub** | $40.734,12 | $19.235,56 | En Turno |
| **337** | **ADRIANAMOZO** | **$365.390,00** | 12 | **26 cub** | $30.449,17 | $14.053,46 | En Turno |
| **983** | **LUCIA** | **$74.250,00** | 1 | **3 cub** | $74.250,00 | $24.750,00 | En Turno |
| **317** | **FERNANDA** | **$21.240,00** | 1 | **2 cub** | $21.240,00 | $10.620,00 | En Turno |
| **TOTAL SALÓN** | **6 Colaboradores** | **$2.897.960,00** | **87** | **118.00 cub** | **$33.309,89** | **$24.558,98** | **Maxirest POS 10783** |
| **TOTAL CIERRE** | *Salón + Delivery/Otros* | **$3.019.960,00** | **89** | **118.00 cub** | **$33.932,13** | **$25.592,88** | *Arqueo Oficial* |

*(Coincidencia 100% verificada contra el Informe Maxirest Pro Rental 7.3 - Gastro Market SRL #10783 emitido el 15/10/26 a las 09:24 hs).*
`;

fs.writeFileSync(target, content + section9 + '\n', 'utf8');
console.log('Successfully appended Section 9 to LOG_INCIDENCIAS_MOZOS_Y_PLATOS.md');
