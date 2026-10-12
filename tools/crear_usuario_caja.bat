@echo off
pushd "%~dp0"

echo ========================================================
echo   MaxiProtocol - Configuracion de Usuario en Caja
echo ========================================================
echo.

set MYSQL_BIN=

if exist "C:\Servidor_MariaDB\bin\mysql.exe" set MYSQL_BIN=C:\Servidor_MariaDB\bin\mysql.exe
if not defined MYSQL_BIN if exist "C:\MaxiREST_SQL\mysql.exe" set MYSQL_BIN=C:\MaxiREST_SQL\mysql.exe
if not defined MYSQL_BIN if exist "C:\MaxiADMIN\mysql.exe" set MYSQL_BIN=C:\MaxiREST_SQL\mysql.exe
if not defined MYSQL_BIN if exist "C:\Program Files\MariaDB 10.4\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MariaDB 10.4\bin\mysql.exe
if not defined MYSQL_BIN if exist "C:\Program Files\MariaDB 10.5\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MariaDB 10.5\bin\mysql.exe
if not defined MYSQL_BIN if exist "C:\Program Files\MariaDB 10.6\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MariaDB 10.6\bin\mysql.exe
if not defined MYSQL_BIN if exist "C:\Program Files\MariaDB 10.3\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MariaDB 10.3\bin\mysql.exe
if not defined MYSQL_BIN if exist "C:\MariaDB\bin\mysql.exe" set MYSQL_BIN=C:\MariaDB\bin\mysql.exe

if not defined MYSQL_BIN (
    echo Buscando mysql.exe en disco C:...
    for /f "delims=" %%i in ('dir /b /s "C:\mysql.exe" 2^>nul') do (
        set MYSQL_BIN=%%i
        goto :found_mysql
    )
)

:found_mysql
if not defined MYSQL_BIN (
    echo [ERROR] No se encontro mysql.exe en el disco C:
    pause
    popd
    exit /b 1
)

echo Encontrado: "%MYSQL_BIN%"
echo.
echo [1/2] Creando usuario maxiprotocol en puerto 3399...
"%MYSQL_BIN%" -P 3399 -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'maxiprotocol'@'%' IDENTIFIED BY 'Maxi2026!*'; FLUSH PRIVILEGES;" 2>nul

if %errorlevel% neq 0 (
    echo.
    echo Probando con solicitud de clave de root...
    "%MYSQL_BIN%" -P 3399 -u root -p -e "GRANT ALL PRIVILEGES ON *.* TO 'maxiprotocol'@'%' IDENTIFIED BY 'Maxi2026!*'; FLUSH PRIVILEGES;"
)

echo.
echo [2/2] Verificando conexion...
"%MYSQL_BIN%" -P 3399 -u maxiprotocol -p"Maxi2026!*" -e "SHOW DATABASES;"

echo.
echo ========================================================
echo   Configuracion finalizada exitosamente!
echo ========================================================
pause
popd
