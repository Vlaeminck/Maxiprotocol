# Estudio de Ingeniería Inversa y Arquitectura: Maxirest POS
## Análisis del Sistema, Stack Tecnológico y Protocolo de Extracción en Tiempo Real ("MaxiProtocol")

---

### 1. Resumen Ejecutivo y Diagnóstico del Sistema

**Maxirest** (desarrollado por **Maxi Sistemas S.R.L.**, fundado en Buenos Aires por Aldo Pecile) es el sistema de gestión integral (ERP / Punto de Venta - POS) más difundido en el rubro gastronómico en Argentina y con fuerte presencia en el Cono Sur (Uruguay, Paraguay, etc.).

Su adopción masiva se debe a su especialización profunda en la operativa gastronómica:
*   Gestión de salón y adición de mesas por sectores.
*   Comanderas remotas de producción (cocina, barra, parrilla, cafetería).
*   Módulo de Delivery con integración a apps (PedidosYa, Rappi) y llamadas telefónicas.
*   Control de cajas, turnos, arqueos (X y Z fiscal) y facturación con controladores fiscales (Hasar, Epson de vieja y nueva generación) y Factura Electrónica AFIP.
*   Control de inventario, stock, recetas y mermas.

---

### 2. ¿Qué Lenguaje y Tecnologías Utiliza Maxirest?

#### A. Lenguaje del Núcleo (Core Application)
*   **Lenguaje Principal**: **Embarcadero Delphi / Object Pascal** (código nativo Win32/Win64 compilado a código máquina).
*   **Por qué Delphi**:
    1.  **Rendimiento y Tiempo de Respuesta**: En un restaurante durante hora pico, el POS no puede tener retrasos por recolector de basura o capas de interpretación. Delphi compila a binario directo x86/x64.
    2.  **Interacción de Bajo Nivel con Hardware POS**: Comunicación directa con puertos serie (RS232/COM), paralelos (LPT) y USB para impresoras de comandas (ESC/POS), impresoras fiscales (protocolos Hasar/Epson), gavetas portamonedas y balanzas electrónicas.
    3.  **Larga Trayectoria de Código**: Maxirest evolucionó desde la década de 1990 sobre la plataforma Delphi VCL (Visual Component Library).

#### B. Motor de Base de Datos
*   **Motor RDBMS**: **Firebird SQL** (derivado de Borland InterBase).
*   **Archivos de Datos**: Archivos `.FDB` (o `.GDB` en versiones legadas). Generalmente ubicado en el servidor principal en rutas como `C:\MaxiRest\Datos\MAXIREST.FDB` o configurado en la carpeta raíz de la instalación.
*   **Puerto de Red Predeterminado**: **TCP 3050** (puerto estándar de escucha de Firebird SuperServer / ClassicServer).
*   **Librerías Cliente (DLLs)**:
    *   `fbclient.dll`: Librería cliente nativa de Firebird.
    *   `gds32.dll`: Alias / envoltura de compatibilidad heredada de InterBase.
*   **Dialecto SQL**: Dialect 3.
*   **Usuario Predeterminado**: `SYSDBA`.
*   **Herramienta de Mantenimiento**: `ResguardarDB.exe` (ejecutable en el servidor que invoca servicios de backup de Firebird sin detener la base de datos).

#### C. Ecosistema Moderno y Cloud
*   **Mi Maxirest / Maxirest Manager**: Plataforma web y móvil para dueños y supervisores.
*   **Maxi Connect / Partners API**: Portal `partners.maxisistemas.com.ar` y pasarela `api-mconn.maxisistemas.com.ar`. Utiliza microservicios web (Node.js / .NET / Webhooks) para integrar pedidos de delivery externos (PedidosYa, Mercado Pago, etc.).

---

### 3. Vías de Integración y Extracción de Datos

Existen tres caminos posibles para comunicarse con Maxirest:

| Enfoque | Descripción | Latencia | Viabilidad Técnica | Dependencia de Maxi Sistemas |
| :--- | :--- | :--- | :--- | :--- |
| **1. Conexión Directa a Firebird (Recomendado)** | Conexión directa al motor SQL local (puerto 3050) en modo `READ-ONLY`. | < 1 segundo | **Alta** (usada por herramientas como Factor BI / Vansync). | Ninguna (independiente). |
| **2. API Oficial Maxi Connect** | Consumo vía HTTP/REST en `api-mconn.maxisistemas.com.ar`. | 5 - 30 segundos | **Media** (requiere alta como Partner autorizado). | Total (contrato comercial y aprobación de Maxi Sistemas). |
| **3. Interceptor Local / Sniffer** | Captura de paquetes TCP 3050 o interceptor de spoolers de impresión. | < 500 ms | **Baja** (muy frágil ante cambios de protocolo interno). | Ninguna. |

> **Conclusión Estratégica**: Para construir un **Dashboard en Tiempo Real de alto rendimiento**, el método óptimo y probado en la industria es **desarrollar un Agente Local ("Edge Daemon") que consulte directamente la base de datos Firebird en modo solo lectura**, transmitiendo los datos mediante WebSockets al dashboard.

---

### 4. Arquitectura de la Solución: "MaxiProtocol"

El sistema "MaxiProtocol" se compone de tres capas desacopladas:

```
+-------------------------------------------------------------------------------+
|                        RESTAURANTE (RED LOCAL LAN)                            |
|                                                                               |
|  [ Terminal POS 1 ]      [ Terminal POS 2 ]      [ Comandera Cocina ]        |
|          \                      |                      /                      |
|           \                     |                     /                       |
|       +-------------------------------------------------------+               |
|       |     SERVIDOR LOCAL WINDOWS (C:\MaxiRest\)             |               |
|       |                                                       |               |
|       |  +--------------------+       +--------------------+  |               |
|       |  |  Maxirest (Delphi) |       |  Firebird SQL      |  |               |
|       |  |  Proceso POS       | ----> |  Puerto 3050 (.FDB)|  |               |
|       |  +--------------------+       +---------+----------+  |               |
|       |                                         |             |               |
|       |                                  (Read-Only Query)    |               |
|       |                                         v             |               |
|       |                      +------------------------------+ |               |
|       |                      |  MAXIPROTOCOL EDGE AGENT     | |               |
|       |                      |  (Daemon Node.js / Python)   | |               |
|       |                      |  - Polling diferencial (1s)  | |               |
|       |                      |  - Snapshot de Salón / Mesas | |               |
|       |                      |  - Detección de Comandas     | |               |
|       |                      +--------------+---------------+ |               |
|       +-------------------------------------|-----------------+               |
|                                             | (WebSocket / Local LAN o WSS)   |
+---------------------------------------------|---------------------------------+
                                              v
                 +--------------------------------------------+
                 |    MAXIPROTOCOL DASHBOARD (TIEMPO REAL)    |
                 |                                            |
                 |  - Mapa de Mesas y Salón Interactivo       |
                 |  - Tiempos de Espera y Alertas de Cocina   |
                 |  - Facturación Acumulada del Día           |
                 |  - Ticket Promedio y Medios de Pago        |
                 |  - Desempeño y Productividad por Mozo      |
                 |  - Mix de Ventas por Rubros                |
                 +--------------------------------------------+
```

---

### 5. Esquema de Datos Firebird Típico y Queries de Extracción

Para evitar cualquier impacto o bloqueo en la operación del restaurante, las consultas deben ejecutarse bajo:
*   Nivel de aislamiento: `READ COMMITTED`.
*   Modo de transacción: `READ ONLY` (o `SNAPSHOT TABLE STABILITY` en modo solo lectura).
*   Índices temporales: `WHERE FECHA >= :FECHA_HOY`.

#### A. Mesas y Estado de Salón en Tiempo Real
Permite saber qué mesas están libres, ocupadas, pidiendo la cuenta o esperando comida:
```sql
SELECT 
    M.ID_MESA,
    M.NUMERO_MESA,
    M.SECTOR,
    M.ESTADO,             -- 0: Libre, 1: Ocupada, 2: Pidiendo Cuenta, 3: Reservada
    M.CANT_PERSONAS,
    M.HORA_APERTURA,
    M.ID_MOZO,
    MOZ.NOMBRE AS MOZO_NOMBRE,
    COALESCE(SUM(C.SUBTOTAL), 0) AS TOTAL_ACUMULADO,
    DATEDIFF(MINUTE FROM M.HORA_APERTURA TO CURRENT_TIMESTAMP) AS MINUTOS_OCUPADA
FROM MESAS M
LEFT JOIN MOZOS MOZ ON M.ID_MOZO = MOZ.ID_MOZO
LEFT JOIN COMANDAS C ON M.ID_MESA = C.ID_MESA AND C.ESTADO = 'ABIERTA'
GROUP BY M.ID_MESA, M.NUMERO_MESA, M.SECTOR, M.ESTADO, M.CANT_PERSONAS, M.HORA_APERTURA, M.ID_MOZO, MOZ.NOMBRE;
```

#### B. Flujo de Comandas en Vivo (Cocina / Barra)
Detecta pedidos ingresados y demoras:
```sql
SELECT 
    CD.ID_DETALLE,
    C.ID_COMANDA,
    C.ID_MESA,
    M.NUMERO_MESA,
    CD.ID_ARTICULO,
    A.DESCRIPCION AS ARTICULO,
    CD.CANTIDAD,
    CD.OBSERVACIONES,
    CD.HORA_PEDIDO,
    CD.ESTADO,            -- 'MARCHANDO', 'LISTO', 'ENTREGADO'
    R.DESCRIPCION AS RUBRO
FROM COMANDAS_DETALLE CD
JOIN COMANDAS C ON CD.ID_COMANDA = C.ID_COMANDA
JOIN MESAS M ON C.ID_MESA = M.ID_MESA
JOIN ARTICULOS A ON CD.ID_ARTICULO = A.ID_ARTICULO
LEFT JOIN RUBROS R ON A.ID_RUBRO = R.ID_RUBRO
WHERE C.FECHA = CURRENT_DATE AND CD.ESTADO IN ('MARCHANDO', 'PENDIENTE')
ORDER BY CD.HORA_PEDIDO ASC;
```

#### C. Ventas del Día y Métricas de Facturación
Para el cálculo de KPIs globales (facturación bruta, ticket promedio, formas de pago):
```sql
SELECT 
    COUNT(V.ID_VENTA) AS TOTAL_TICKETS,
    COALESCE(SUM(V.TOTAL), 0) AS FACTURACION_TOTAL,
    COALESCE(AVG(V.TOTAL), 0) AS TICKET_PROMEDIO,
    COALESCE(SUM(V.CANT_CUBIERTOS), 0) AS TOTAL_CUBIERTOS
FROM VENTAS V
WHERE V.FECHA = CURRENT_DATE AND V.ESTADO <> 'ANULADA';
```

---

### 6. Consideraciones de Seguridad y Buenas Prácticas

1.  **Regla de Oro: Acceso de Solo Lectura (`READ-ONLY`)**:
    *   Bajo ninguna circunstancia la interfaz externa debe escribir, modificar o borrar registros en las tablas operativas de Maxirest directamente por SQL. Las modificaciones deben hacerse exclusivamente a través de los ejecutables de Maxirest para preservar la integridad de numeración fiscal y auditoría.
2.  **No Bloqueo de Transacciones (Lock Avoidance)**:
    *   Configurar la conexión con `isc_tpb_read`, `isc_tpb_read_committed` y `isc_tpb_rec_version` para evitar bloquear la adición de mozos mientras se lee un reporte.
3.  **Manejo de Credenciales**:
    *   En Firebird tradicional, el usuario es `SYSDBA`. Se recomienda crear un usuario secundario en Firebird con permisos exclusivos de `SELECT`:
        ```sql
        CREATE USER MAXIDASHBOARD PASSWORD 'TuPasswordSegura';
        GRANT SELECT ON MESAS TO MAXIDASHBOARD;
        GRANT SELECT ON COMANDAS TO MAXIDASHBOARD;
        GRANT SELECT ON VENTAS TO MAXIDASHBOARD;
        ```
4.  **Resiliencia ante Reinicios del Servidor**:
    *   El Edge Agent debe registrarse como un **Servicio de Windows** (`node-windows` o `nssm`) con reinicio automático.
