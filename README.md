# MaxiProtocol 🚀
### Sistema de Extracción en Tiempo Real y Dashboard Analítico para Maxirest POS

MaxiProtocol es una solución integral diseñada para extraer datos operativos de **Maxirest POS** (el software de gestión gastronómica líder en Argentina y Latinoamérica) y transmitirlos con latencia submétrica (<1s) hacia un **Dashboard Web en Tiempo Real**.

---

## 📋 Resumen del Estudio Técnico de Maxirest

*   **Lenguaje del Core**: **Embarcadero Delphi (Object Pascal)** nativo para Windows (Win32/Win64). Permite el control directo del hardware gastronómico (puertos COM para impresoras fiscales Hasar/Epson, comanderas térmicas ESC/POS, balanzas y gavetas).
*   **Motor de Base de Datos**: **Firebird SQL** (derivado de InterBase).
    *   **Extensión de archivo**: `.FDB` (típicamente `C:\MaxiRest\Datos\MAXIREST.FDB`).
    *   **Puerto TCP de escucha**: `3050`.
    *   **Librerías cliente**: `fbclient.dll` / `gds32.dll`.
    *   **Usuario por defecto**: `SYSDBA` (con clave de fábrica `masterkey` o configurada localmente).
*   **Mecanismo Óptimo de Extracción**: Daemon en red local (LAN) ejecutando consultas SQL directas en modo **`READ-ONLY` / `READ COMMITTED`**. Este enfoque garantiza **cero impacto** y **cero bloqueos** sobre la adición de comandas del restaurante.

Para leer el estudio completo de ingeniería inversa, tablas y queries SQL recomendadas, consulte [ARQUITECTURA_MAXIREST.md](ARQUITECTURA_MAXIREST.md).

---

## 🎯 Capacidades del Dashboard en Tiempo Real

1.  **Plano de Salón Interactivo**: Visualización en vivo del estado de cada mesa (Libre, Ocupada, Pidiendo Cuenta, Alerta de Cocina), comensales, mozo asignado y total acumulado. Al hacer clic en cualquier mesa se abre el desglose de ítems marchados en su comanda.
2.  **Monitor de Producción (Cocina & Barra)**: Stream de comandas entrantes con alertas visuales y auditivas ante pedidos con demoras excesivas (>12 min).
3.  **Métricas Ejecutivas (KPIs)**: Facturación del día en ARS, Ticket Promedio, Porcentaje de Ocupación con barra de progreso, Cubiertos totales y Medios de Pago.
4.  **Ranking de Mozos**: Leaderboard en tiempo real que mide volumen de ventas y cantidad de mesas atendidas por cada integrante del salón.
5.  **Arquitectura Multi-Protocolo Soportada**:
    *   **Modo Maxirest Local (Recomendado)**: Extracción directa de alta velocidad de las 392 tablas DBF en `C:\MaxiRest` (ventas, tickets, mozos, artículos, comandas).
    *   **Modo Servidor LAN Maxirest (CAJA)**: Conexión TCP al motor MariaDB de Maxirest en el puerto `3399` (`192.168.1.3:3399`, base `mx_10783`).
    *   **Modo Firebird Real**: Conexión al motor Firebird SQL en el puerto `3050`.
    *   **Modo Emulador**: Motor simulador de alta fidelidad para pruebas offline y desarrollo.

---

## 💻 Requisitos para la Ejecución Local (System Requirements)

### 1. Requisitos Generales del Sistema
*   **Sistema Operativo:**
    *   **Para producción en restaurante:** Windows 10, Windows 11 o Windows Server (donde resida la instalación de Maxirest).
    *   **Para desarrollo / pruebas:** Windows, macOS o Linux (operando en Modo Emulador o conectado por red local IP al servidor de Maxirest).
*   **Entorno de Ejecución:**
    *   [Node.js](https://nodejs.org/) **v18.x, v20.x o superior LTS** (incluye `npm`).
    *   Verificar en consola con: `node -v` y `npm -v`.
*   **Navegador Web:**
    *   Google Chrome, Microsoft Edge, Mozilla Firefox o Safari moderno (con soporte para HTML5 Canvas, Web Audio API y WebSockets).
*   **Puertos de Red:**
    *   **Puerto 3000:** Utilizado por el servidor web y WebSocket de MaxiProtocol (configurable mediante la variable `PORT`).

---

### 2. Requisitos Específicos para Conexión Real con Maxirest (Modo Firebird)

Si vas a conectar con la base de datos operativa del restaurante:

1.  **Servicio Firebird Activo:**
    *   El servicio `Firebird Server` (versiones 2.1, 2.5 o 3.0 instaladas por Maxirest) debe estar en ejecución en Windows (`services.msc`).
2.  **Puerto TCP 3050:**
    *   Debe estar abierto en el servidor.
    *   Si MaxiProtocol corre en una PC distinta dentro de la misma red local (LAN), agregar una regla de entrada en el **Firewall de Windows** para el puerto TCP `3050`.
3.  **Librerías Cliente (`fbclient.dll` / `gds32.dll`):**
    *   En la máquina con Maxirest ya están presentes en `C:\Windows\System32` o dentro de la carpeta de Maxirest.
4.  **Librerías de Ejecución de C++ (Windows):**
    *   [Visual C++ Redistributable 2015-2022](https://learn.microsoft.com/es-es/cpp/windows/latest-supported-vc-redist) (necesario si se compilan drivers nativos de Firebird).
5.  **Permisos de Archivo:**
    *   Permiso de lectura en el archivo `.FDB` de Maxirest (ej. `C:\MaxiRest\Datos\MAXIREST.FDB`).

---

## ⚡ Guía de Instalación y Puesta en Marcha

### Paso 1: Clonar o Descargar el Repositorio
```bash
git clone https://github.com/Vlaeminck/Maxiprotocol.git
cd Maxiprotocol
```

### Paso 2: Instalar Dependencias
Ejecute en la terminal:
```bash
npm install
```

### Paso 3: Detectar la Base de Datos Maxirest (En la PC del Restaurante)
Haga doble clic en el archivo:
👉 **`descubrir_maxirest.bat`** (o ejecute `node tools/discover_maxirest.js`)

Este script ejecutará un diagnóstico automático:
*   Escanea discos en busca de carpetas de Maxirest.
*   Encuentra archivos `.FDB` y lee `aliases.conf`.
*   Comprueba si el puerto `3050` está respondiendo.
*   Genera automáticamente el archivo `config.json` con los parámetros listos para usar.

### Paso 4: Iniciar el Servidor
Haga doble clic en:
👉 **`start.bat`** (o ejecute `npm start`)

Verá en consola:
```text
=======================================================
🚀 MaxiProtocol Dashboard en Tiempo Real
📡 Servidor escuchando en: http://localhost:3000
🔌 Motor de datos: Modo SIMULATOR (o FIREBIRD)
=======================================================
```

### Paso 5: Abrir el Dashboard
Abra su navegador en:
**`http://localhost:3000`**

---

## ⚙️ Configuración y Variables de Entorno

### Archivo `config.json`
El archivo se crea automáticamente o puede inicializarse copiando la plantilla:
```bash
copy config.example.json config.json
```

Contenido de `config.json`:
```json
{
  "host": "127.0.0.1",
  "port": 3050,
  "database": "C:\\MaxiRest\\Datos\\MAXIREST.FDB",
  "user": "SYSDBA",
  "password": "masterkey",
  "mode": "FIREBIRD"
}
```

*   `host`: `127.0.0.1` si corre en el mismo servidor de Maxirest, o la IP LAN (ej. `192.168.1.100`) si corre en otra máquina de la red.
*   `port`: `3050` (puerto estándar de Firebird).
*   `database`: Ruta física al archivo `.FDB` en el servidor.
*   `mode`: `"FIREBIRD"` para base real, o `"SIMULATOR"` para pruebas sintéticas.

### Variables de Entorno Opcionales
| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde se sirve el Dashboard | `3000` |

---

## 📂 Estructura del Repositorio

```text
Maxiprotocol/
├── ARQUITECTURA_MAXIREST.md   # Informe técnico exhaustivo de Maxirest y Firebird
├── README.md                  # Documentación general y requisitos de ejecución
├── package.json               # Dependencias del proyecto (Express, Socket.io, Cors)
├── config.example.json        # Plantilla de configuración de conexión
├── server.js                  # Servidor Express + WebSocket en tiempo real
├── start.bat                  # Lanzador directo de un solo clic para Windows
├── descubrir_maxirest.bat     # Asistente de detección de Maxirest y Firebird
├── extractor/
│   ├── firebird_client.js     # Conector Firebird con transacciones READ-ONLY seguras
│   └── simulator.js           # Motor de simulación gastronómica de alta fidelidad
├── tools/
│   └── discover_maxirest.js   # Script de diagnóstico de base de datos y puertos
└── public/
    ├── index.html             # Estructura del Dashboard interactivo
    ├── css/dashboard.css      # Sistema de diseño Obsidian Dark Mode
    └── js/app.js              # Lógica de cliente WebSockets, gráficos y audio
```

---

## 🛡️ Seguridad y Buenas Prácticas
*   **Aislamiento de solo lectura:** Las consultas a Firebird usan siempre `READ COMMITTED` y `READ ONLY`.
*   **Cero impacto operativo:** No se ejecutan bloqueos de tabla ni escrituras sobre las comandas de Maxirest.
*   **Auditoría y respaldo:** Nunca modifique el archivo `.FDB` mientras Maxirest esté en uso sin usar las herramientas oficiales de resguardo (`ResguardarDB.exe`).
