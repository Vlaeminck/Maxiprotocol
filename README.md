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

Para leer el estudio completo de ingeniería inversa, tablas y queries SQL recomendadas, consulte [ARQUITECTURA_MAXIREST.md](file:///c:/Users/Tom/Desktop/Maxiprotocol/ARQUITECTURA_MAXIREST.md).

---

## 🎯 Capacidades del Dashboard en Tiempo Real

1.  **Plano de Salón Interactivo**: Visualización en vivo del estado de cada mesa (Libre, Ocupada, Pidiendo Cuenta, Alerta de Cocina), comensales, mozo asignado y total acumulado. Al hacer clic en cualquier mesa se abre el desglose de ítems marchados en su comanda.
2.  **Monitor de Producción (Cocina & Barra)**: Stream de comandas entrantes con alertas visuales y auditivas ante pedidos con demoras excesivas (>12 min).
3.  **Métricas Ejecutivas (KPIs)**: Facturación del día en ARS, Ticket Promedio, Porcentaje de Ocupación con barra de progreso, Cubiertos totales y Medios de Pago.
4.  **Ranking de Mozos**: Leaderboard en tiempo real que mide volumen de ventas y cantidad de mesas atendidas por cada integrante del salón.
5.  **Doble Modo Operativo**:
    *   **Modo Firebird Real**: Conexión al motor de base de datos de Maxirest en el puerto 3050.
    *   **Modo Emulador**: Motor simulador de alta fidelidad que genera transacciones gastronómicas realistas para pruebas y desarrollo.

---

## ⚡ Inicio Rápido (Quick Start)

### Requisitos
*   [Node.js](https://nodejs.org/) v18+ instalado en el equipo.

### Paso a Paso
1.  Abra una consola en esta carpeta o haga doble clic en el archivo [start.bat](file:///c:/Users/Tom/Desktop/Maxiprotocol/start.bat).
2.  Si es la primera vez, instale dependencias ejecutando:
    ```bash
    npm install
    ```
3.  Inicie el servidor:
    ```bash
    npm start
    ```
4.  Abra su navegador web en:
    ```
    http://localhost:3000
    ```

---

## ⚙️ Configuración de Conexión a Maxirest

Dentro de la interfaz web, haga clic en el botón superior **"Conexión Firebird"** para configurar:
*   **Host**: Dirección IP del servidor de Maxirest (ej. `127.0.0.1` si corre en la misma máquina o la IP LAN `192.168.1.X`).
*   **Puerto**: `3050` (predeterminado de Firebird).
*   **Ruta Base de Datos**: Ruta absoluta al archivo `.fdb` (ej. `C:\MaxiRest\Datos\MAXIREST.FDB`).
*   **Credenciales**: Usuario y contraseña de Firebird (`SYSDBA`).

---

## 📂 Estructura del Proyecto

*   `server.js`: Servidor Express y Socket.io con endpoints REST y streaming en tiempo real.
*   `extractor/firebird_client.js`: Conector Firebird para consultas `READ-ONLY` seguras.
*   `extractor/simulator.js`: Motor de simulación gastronómica en tiempo real.
*   `public/`:
    *   `index.html`: Estructura del Dashboard de alto impacto visual.
    *   `css/dashboard.css`: Sistema de diseño moderno (Dark Theme, Glassmorphism, Micro-animaciones).
    *   `js/app.js`: Lógica del cliente, gráficos Chart.js, WebSockets y síntesis de audio.
*   `ARQUITECTURA_MAXIREST.md`: Informe técnico detallado de arquitectura, lenguaje y bases de datos.
