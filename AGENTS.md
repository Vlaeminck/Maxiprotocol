# 🤖 GUÍA DE CONTEXTO Y ARQUITECTURA PARA AGENTES DE IA (MaxiProtocol)

> **Documento Maestro de Operaciones y Referencia de Ingeniería**  
> **Proyecto:** MaxiProtocol — Extracción en Tiempo Real & Dashboard Analítico de Decisión  
> **Sistema Fuente:** Maxirest POS (Cliente Gastronómico #10783 - *Gastro Market SRL*)  
> **Última Actualización:** Octubre 2026

---

## 🛑 0. REGLA SUPREMA: OPERAR EXCLUSIVAMENTE CON DATOS REALES (CERO SIMULACIÓN / CERO INVENCIÓN)

> 🚨 **DIRECTIVA PERMANENTE E INQUEBRANTABLE PARA AGENTES DE IA:**  
> **QUEDA TERMINANTEMENTE PROHIBIDO SIMULAR, ESTIMAR, EXTRAPOLAR O INVENTAR CUALQUIER DATO.**  
> 
> 1. **Fuente de Verdad Única:** Todo dato mostrado en la plataforma (facturación, tickets, cubiertos, platos, categorías/rubros, mozos, medios de pago, horarios) **DEBE provenir pura y exclusivamente de los archivos y bases de datos reales de Maxirest POS** (`C:\MaxiRest\*.dbf`, `C:\MaxiREST_SQL\bakinforme.dbf`, MariaDB `mx_10783`, Firebird `MAXIREST.FDB`).
> 2. **Prohibición Total de Categorías o Rubros Inventados:** Está estrictamente prohibido crear nombres de fantasía o categorías artificiales como "Especialidades Restó". Se deben utilizar única y exclusivamente las categorías y rubros reales dados de alta en Maxirest POS (`PASTELERIA`, `ALMUERZO CENA`, `BEBIDAS`, `MARKET`, `ADICIONALES`, `CAFETERIA`, `POSTRES`, `BOX GDS`).
> 3. **Prohibición de Emuladores / Generadores Sintéticos:** Queda erradicado el uso de distribuciones sintéticas (`Math.random()`, pesos inventados, multiplicadores de comensales, comensales estimados, mozos ficticios o datos generados para "rellenar").
> 4. **Tratamiento de Datos Faltantes:** Si para una fecha o período Maxirest POS no cuenta con el informe emitido o la información no existe en las tablas, **se debe informar explícitamente como "Sin informe emitido en Maxirest POS" o valor $0 / 0 cubiertos**. **Bajo ninguna circunstancia se debe inventar o aproximar información para tapar un vacío visual**.
> 5. **Fidelidad Fiscal y Operativa 1:1:** Cualquier discordancia entre lo reportado por MaxiProtocol y un informe oficial impreso o emitido por Maxirest POS es considerada una falla crítica de auditoría.

---

## 📌 1. Visión y Propósito del Proyecto

MaxiProtocol es una plataforma de extracción en tiempo real y panel de Business Intelligence / Control Operativo diseñada para integrarse con **Maxirest POS**, el sistema líder de gestión gastronómica en Argentina y la región.

El objetivo central es proporcionar a directivos, gerentes de salón y personal de caja:
1. **Métricas en vivo con latencia <1s:** Estado del salón, mesas ocupadas, comandas demoradas en cocina, ranking de mozos en turno.
2. **Histórico y Auditoría Forense:** Rendimiento diario, facturación neta, desglose de formas de cobro (Tarjetas Nave, Efectivo, Mercado Pago, PedidosYa), Pareto de platos y costos.
3. **Cero Impacto Operativo:** La extracción funciona en modo lectura (`read-only`) sin bloquear terminales de comanda ni afectar la facturación fiscal del restaurante.

---

## 🏛️ 2. Entorno Físico y Rutas de Maxirest en la Máquina Host

El entorno de producción reside en un entorno Windows nativo con las siguientes rutas críticas:

| Componente | Ruta en Host | Descripción y Rol |
| :--- | :--- | :--- |
| **Punto de Venta (POS)** | `C:\MaxiREST_SQL\MAXIREST.EXE` | Binario Delphi nativo de Maxirest. |
| **Acceso Directo POS** | `C:\Users\Gardenias\Desktop\MaxiREST 10783.lnk` | Acceso directo de terminal caja #10783. |
| **Tablas Transaccionales DBF** | `C:\MaxiRest` | Contiene ~392 archivos `.dbf` con ventas, clientes y configuración. |
| **Arqueos y Cierres** | `C:\MaxiREST_SQL\bakinforme.dbf` | Informe de caja/ventas más reciente volcado por Maxirest. |
| **Módulos / Permisos** | `C:\MaxiREST_SQL\mxmod.DBF` | Licencia y terminales autorizadas. |
| **Reportes Guardados** | `C:\MaxiREST_SQL\infventas_*.Prf` | Parámetros de filtros de reportes ejecutados por el usuario. |
| **Servidor MariaDB LAN** | `192.168.1.3:3399` | Servidor central de caja (`CAJA`), base `mx_10783`. |
| **Servidor MariaDB Local** | `C:\Servidor_MariaDB` (Puerto 3399) | Instancia MariaDB local vinculada al software. |
| **Servidor Firebird SQL** | Puerto `3050` | Motor tradicional SQL (`MAXIREST.FDB`). |
| **Administración / Backups** | `C:\MaxiADMIN`, `C:\MaxiBack` | Resguardos automáticos diarios. |

---

## ⚙️ 3. Arquitectura del Código (`Maxiprotocol/`)

```
Maxiprotocol/
├── server.js                      # Servidor Express + Socket.IO + Routing API
├── config.json                    # Configuración persistente (modo, IPs, puertos)
├── extractor/
│   ├── maxirest_analytics.js      # Motor de analítica multi-día, KPIs y días dinámicos
│   ├── maxirest_dbf_client.js     # Lector nativo de tablas DBF de Maxirest
│   ├── mariadb_client.js          # Conector MariaDB (puerto 3399)
│   ├── firebird_client.js         # Conector Firebird (puerto 3050)
│   └── simulator.js               # Emulador sintético de alta fidelidad
├── public/
│   ├── index.html                 # UI Dashboard moderna (Dark Obsidian Theme)
│   ├── css/
│   │   └── dashboard.css          # Sistema de diseño, tokens, glassmorphism y micro-animaciones
│   └── js/
│       └── app.js                 # Lógica cliente, estado reactivo, gráficos y WebSockets
└── tools/                         # Scripts forenses y utilitarios de auditoría
```

---

## 📅 4. REGLA FUNDAMENTAL DE FECHAS: Sistema Dinámico Multi-Día

> ⚠️ **REGLA ESTRICTA PARA AGENTES:**  
> **NUNCA HARDCODEAR FECHAS COMO "HOY" O "AYER" EN EL CÓDIGO.**  
> Previamente, el sistema quedó anclado a `2026-10-12` con facturación $0 porque fue desarrollado durante ese turno antes del cierre. Cuando el reloj avanzó al día 13, el sistema no traía los datos consolidados de ayer ni reconocía el día de hoy.

### 4.1. Cómo Funciona la Resolución Dinámica:
1. **`getTodayKey()` en `maxirest_analytics.js`**:
   - Genera dinámicamente `YYYY-MM-DD` de la fecha local actual del sistema (`new Date()`).
   - Hoy = Turno **"En Vivo / En Curso"** conectado a streaming de mesas y comandas.
2. **`getYesterdayKey()` en `maxirest_analytics.js`**:
   - Genera `YYYY-MM-DD` del día anterior (`today - 1 día`).
   - Ayer = Período **"Cierre Ayer"** con facturación final consolidada.
3. **`getAvailableDays()`**:
   - Devuelve la lista ordenada:
     1. `Hoy` (con etiqueta dinámica `Hoy DD/MM` y tag `En Vivo / En Curso`)
     2. `Ayer` (con etiqueta dinámica `Ayer DD/MM` y tag `Cierre Ayer`)
     3. Todos los días auditados precedentes ordenados de forma descendente.
4. **Cualquier Día Histórico (`buildGenericDayData`)**:
   - Si el usuario selecciona cualquier fecha histórica en el calendario (`<input type="date">`), el sistema genera o recupera el análisis sin fallar.
5. **Frontend Reactivo (`public/js/app.js`)**:
   - Las píldoras superiores `#day-pills-container` **NO son estáticas**; se renderizan por fetch desde `/api/analytics/days`.
   - Los sockets solo actualizan el monitor de salón en vivo cuando `isTodayDate(AppState.selectedDate) === true`.

---

## 💳 5. Mapeo Oficial de Datos Auditados de Maxirest

Información verificada contra informes oficiales de cierre emitidos por Maxirest POS:

| Fecha | Día de la Semana | Facturación Neta | Tickets | Cub (Comensales) | DBF Origen |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2026-10-14** | Miércoles (Ayer) | **$3.019.960** | 89 | **118 Cub** | `35378568.dbf` / `35371505.dbf` / `33841499.dbf` |
| **2026-10-13** | Martes | **$3.513.750** | 94 | **123 Cub** | `37686378.dbf` / `29726806.dbf` |
| **2026-10-12** | Lunes (Feriado) | **$7.222.960** | 158 | **205** (Cub) | `bakinforme.dbf` / `34539117.dbf` / `33015712.dbf` |
| **2026-10-11** | Domingo | **$6.665.760** | 148 | 192 | `37034789.dbf` |
| **2026-10-10** | Sábado (Pico) | **$6.000.560** | 133 | 173 | `40694411.dbf` |
| **2026-10-09** | Viernes | **$4.598.075** | 120 | 156 | `52568701.dbf` |
| **2026-10-08** | Jueves | **$3.224.480** | 90 | 117 | `32315984.dbf` |
| **2026-10-07** | Miércoles | **$2.671.240** | 71 | **83 Cub** | `37686378.dbf` |
| **2026-10-06** | Martes | **$2.928.500** | 93 | **122 Cub** | `37686378.dbf` |
| **2026-10-05** | Lunes | **$3.124.800** | 71 | **114 Cub** | `37686378.dbf` |
| **2026-10-01** | Jueves | **$7.899.510** | 114 | **189 Cub** | `37580333.dbf` |
| **2026-09-28** | Lunes | **$2.546.875** | 82 | **94 Cub** | `58318956.dbf` |
| **2026-09-01** | Martes | **$4.644.470** | 106 | **125 Cub** | `54358131.dbf` / `42456716.dbf` |
| **2026-08-06** | Jueves | **$1.995.410** | 68 | **82 Cub** | `40385578.dbf` / `bakinforme.dbf` |
| **2026-08-01** | Sábado | **$8.080.270** | 165 | **291 Cub** | `45294870.dbf` |
| **2026-01-02** | Viernes (Enero) | **$4.213.310** | 108 | **187 Cub** | `45294870.dbf` / `35522719.DBF` |
| **2026-01-01** | Jueves (Año Nuevo) | **$0** | 0 | **0 Cub** | *Feriado Nacional (Local Cerrado)* |
| **2024-07-09** | Martes (Feriado) | **$4.707.126** | 194 | **303 Cub** | `35522719.DBF` |
| **2023-10-12** | Jueves | **$1.559.162** | 187 | **305 Cub** | `35522719.DBF` |
| **2023-01-15** | Domingo | **$935.253** | 195 | **355 Cub** | `35522719.DBF` |

### 5.2. Maestro Histórico Fiscal Multianual (`C:\MaxiRest\35522719.DBF`):
- **Tamaño**: 219.53 MB con **301.694 comprobantes fiscales** emitidos por Maxirest POS.
- **Rango Temporal**: Diciembre 2020 hasta Julio 2026 (**1.965 días operativos únicos**).
- **Desglose Anual**: 2020 (24 días), 2021 (311 días), 2022 (336 días), 2023 (361 días), 2024 (362 días), 2025 (361 días), 2026 (210 días).
- **Campos Verídicos**: `TOTAL`, `CUBIERTOS` (CUB exacto en entero binario LE), `COD_CTV` (`Q` Salón, `P` Mostrador, `%` Domicilio), `FECHA`, `MESA`, `NUMERO`.
- **Caché Acelerado**: `extractor/cache_history_35522719.json` precargado para respuestas sub-milisegundo.
- **Resolución de Feriados de Cierre**: Fechas como el 1 de Enero (Año Nuevo) donde el restaurante permanece cerrado se identifican explícitamente como "Feriado Nacional (Local Cerrado)" con 0 operaciones reales, en lugar de mensajes ambiguos de error.

### Detalle Oficial Jue 06/08 (Informe Oficial Maxirest POS "Ventas por Concepto"):
- **Facturación Neta**: $1.995.410,00 en 68 comprobantes · **Prom/Vtas**: $29.344,26
- **Cub (Comensales)**: 82 Cub · **Prom/Cub**: $14.729,76
- **Canales**: Salón $1.207.840,00 | Mostrador $695.570,00 | Domicilio $92.000,00
- **Medios de Cobro**: WNAVE $1.253.800 (41 tks) | Efectivo $491.310 (21 tks) | MP $158.300 (3 tks) | PedidosYa $92.000 (3 tks)
- **Archivos Origen**: `40385578.dbf` (Concepto) / `34306090.dbf` (Medios) / `45294870.dbf` (Ítems)

### Detalle Canales Lun 12/10 (Informe Oficial Maxirest "Ventas por Concepto"):
- **Salón**: $4.479.360,00 (62.0%) · **Cub (Comensales)**: 205 · **Prom/Cub**: $21.762,73
- **Mostrador**: $2.285.200,00 (31.6%)
- **Domicilio**: $458.400,00 (6.3%)
- **Total Ventas / Facturación**: $7.222.960,00 en 158 tickets · **Prom/Vtas**: $45.714,94

### Medios de Cobro Habituales y Parámetros de Liquidación NAVE:
- **WNAVE (Tarjetas)**: 60% – 68% de las transacciones (Lunes 12/10: $4.849.500 en 98 tickets).
  - **Costos por cobro**: **2,633%** (Arancel comercial + IVA sobre aranceles).
  - **Impuestos asociados**: **2,553%** (Retenciones fiscales: IIBB/SIRCREB, IVA, Ganancias).
  - **Deducción total NAVE**: **5,186%** (~5,19%).
  - **Neto liquidado a cuenta**: **94,814%** (~94,81%).
  *(Verificado contra extracto oficial de liquidación NAVE: Bruto $4.830.900,00 | Costos $127.210,30 | Impuestos $123.332,17 | Neto $4.580.357,53)*.
- **EFECTIVO**: 25% – 32% del volumen (Lunes 12/10: $1.947.660 en 50 tickets) · 0% comisión / 100% líquido en caja.
- **HPEDIDOYA**: 4% – 8% de delivery (Lunes 12/10: $425.800 en 10 tickets) · ~15,0% comisión de plataforma.
- **SMERCADO PAGO / VCLOVER**: 1% – 5% · ~0,8% arancel QR MP / 1,8% POS.

> 🚫 **REGLA ESTRICTA DE INTEGRIDAD DE DATOS (CERO SIMULACIÓN Y CERO ESTIMACIÓN):**  
> **SE PROHÍBEN MULTIPLICADORES HEURÍSTICOS (ej. `tickets * 1.30` o montos estimados por día de la semana).**  
> Toda fecha histórica es consultada contra los reportes de concepto oficiales (`bakinforme.dbf`, `40385578.dbf`, `37686378.dbf`) o contra la tabla de transacciones históricas `45294870.dbf` (361 días auditados). Si una fecha no posee operaciones en Maxirest POS, se presenta limpiamente con $0, 0 tickets y 0 cubiertos con la leyenda "Sin operaciones registradas en Maxirest POS". Cero datos inventados.

---

## 🛠️ 6. Guía de Ejecución y Diagnóstico para Agentes

### 6.1. Levantar el Proyecto Localmente
En la terminal (dentro de `c:\Users\Gardenias\Desktop\DEVS\Maxiprotocol\Maxiprotocol`):
```bash
node server.js
```
El servidor escucha en `http://localhost:3000`.

### 6.2. Si el Puerto 3000 está Ocupado
En PowerShell:
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

### 6.3. Verificar Endpoints de la API
- `GET http://localhost:3000/api/status` → Diagnóstico de motores y conectividad.
- `GET http://localhost:3000/api/analytics/days` → Lista dinámica de días (Hoy, Ayer y precedentes).
- `GET http://localhost:3000/api/analytics/day?date=ayer` → Métricas consolidadas del día de ayer.
- `GET http://localhost:3000/api/analytics/day?date=hoy` → Período del turno actual.
- `POST http://localhost:3000/api/sync` → Dispara re-escaneo integral de DBFs, bakinforme.dbf y registro de personal.
- `GET http://localhost:3000/api/snapshot` → Snapshot en vivo (mesas, comandas y métricas).
- `GET http://localhost:3000/api/staff` → Registro de mozos, rotación y plantilla.
- `POST http://localhost:3000/api/staff/update` → Modifica fecha de ingreso, período, estado y platos/postres insignia.
- `POST http://localhost:3000/api/staff/toggle` → Alterna estado entre ACTIVO y BAJA.

---

## 👥 9. Gestión de Personal, Rotación de Mozos y Métricas de Upselling

### 9.1. Registro Maestro Persistente (`config/staff_registry.json`):
- Los mozos tienen su estado (`ACTIVO` o `BAJA`), fecha de ingreso (`fechaIngreso`), fecha de egreso (`fechaEgreso`), período de rotación (`periodoActividad`), plato más vendido y postre estrella.
- Si un mozo no tiene fecha de ingreso asignada (`fechaIngreso: null`), su tarjeta muestra explícitamente el botón **"Asignar"**, abriendo un modal interactivo para que el usuario ingrese la fecha manualmente.
- Los filtros en la barra de mozos permiten alternar entre **"Solo Activos"** (predeterminado, excluyendo personal dado de baja), **"Todos"** y **"Dados de Baja"**.
- Cada tarjeta contiene:
  1. Monograma e identificación de código Maxirest POS.
  2. Badge de estado (`Activo` vs `Dado de Baja`) y tag de período de rotación.
  3. Fila de Fecha de Ingreso con opción de edición directa o botón "Asignar".
  4. Métricas de desempeño: Ventas totales ($), Ticket promedio ($), Comprobantes (tickets) y Comensales (cubiertos).
  5. Bloque gastronómico: Plato más vendido y **Postres vendidos** (unidades, facturación y postre insignia).
  6. Acciones rápidas: Alternar estado ("Dar de Baja" / "Reactivar") y "Ajustar" (modal de edición).

---

## 🎨 10. Principios de Diseño Frontend & Experiencia de Usuario

1. **Estética Dark Obsidian**: El proyecto utiliza una paleta oscura cuidada (`#090d16`, `#0f172a`), bordes sutiles con translucidez (`rgba(255,255,255,0.06)`), acentos cian/esmeralda y tipografía `Plus Jakarta Sans`.
2. **Interactividad Inmediata**: Cualquier cambio de fecha en las píldoras o el calendario actualiza los KPIs, el gráfico de curvas horarias, la distribución de rubros, el ranking de mozos y las tarjetas de medios de pago sin recargar la página.
3. **Consistencia de Estado**: El objeto `AppState` en `public/js/app.js` es la única fuente de verdad para el cliente.

---

## 🧭 11. Check-list para Modificaciones Futuras

Al realizar nuevas integraciones o cambios en el código:
- [ ] ¿Se preservaron las funciones dinámicas `getTodayKey()` y `getYesterdayKey()`?
- [ ] ¿Se verificó que los endpoints manejen alias textuales (`hoy`, `ayer`)?
- [ ] ¿Los botones del selector de días se generan dinámicamente sin duplicados?
- [ ] ¿Las lecturas de DBF cierran siempre los descriptores de archivo (`fs.closeSync`)?
- [ ] ¿Se mantuvo la compatibilidad con el modo simulador para pruebas offline?
- [ ] ¿Se preserva la persistencia en `config/staff_registry.json` al alternar estados de mozos?
