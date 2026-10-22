@echo off
pushd "%~dp0"

echo ========================================================
echo   MaxiProtocol - Habilitador Automatico en Servidor Caja
echo ========================================================
echo.

set LOGFILE=C:\Users\Public\resultado_habilitacion.txt
echo [INICIO] Ejecutando habilitador... > "%LOGFILE%"

set MYSQL_DIR=C:\Servidor_MariaDB
if not exist "%MYSQL_DIR%\bin\mysql.exe" (
    if exist "C:\MaxiREST_SQL\mysql.exe" set MYSQL_DIR=C:\MaxiREST_SQL
)

set MYSQL_EXE="%MYSQL_DIR%\bin\mysql.exe"
if not exist %MYSQL_EXE% set MYSQL_EXE="%MYSQL_DIR%\mysql.exe"

set MYSQLD_EXE="%MYSQL_DIR%\bin\mysqld.exe"
if not exist %MYSQLD_EXE% set MYSQLD_EXE="%MYSQL_DIR%\mysqld.exe"

set MY_INI="%MYSQL_DIR%\my.ini"

echo Motor detectado en: %MYSQL_DIR%
echo Motor detectado en: %MYSQL_DIR% >> "%LOGFILE%"
echo.

:: 1. Detener servicio temporalmente
echo [1/4] Pausando servicio por 3 segundos...
net stop Servidor_MariaDB 2>nul
net stop MariaDB 2>nul
net stop MySQL 2>nul
net stop MaxiREST_SQL 2>nul
timeout /t 2 /nobreak >nul

:: 2. Iniciar mysqld en modo seguro (skip-grant-tables)
echo [2/4] Iniciando modo de configuracion seguro...
start "MariaDB_Temp" /b %MYSQLD_EXE% --defaults-file=%MY_INI% --skip-grant-tables --console
timeout /t 3 /nobreak >nul

:: 3. Crear usuario maxiprotocol con permisos completos
echo [3/4] Creando usuario 'maxiprotocol' con clave 'Maxi2026!*'...
%MYSQL_EXE% -P 3399 -u root -e "FLUSH PRIVILEGES; GRANT ALL PRIVILEGES ON *.* TO 'maxiprotocol'@'%' IDENTIFIED BY 'Maxi2026!*'; FLUSH PRIVILEGES;" 2>> "%LOGFILE%"

if %errorlevel% neq 0 (
    %MYSQL_EXE% -P 3399 -u root -e "FLUSH PRIVILEGES; CREATE USER IF NOT EXISTS 'maxiprotocol'@'%' IDENTIFIED BY 'Maxi2026!*'; GRANT ALL PRIVILEGES ON *.* TO 'maxiprotocol'@'%'; FLUSH PRIVILEGES;" 2>> "%LOGFILE%"
)

:: 4. Cerrar proceso temporal y reanudar servicio normal
echo [4/4] Restaurando servicio normal de MariaDB...
taskkill /f /im mysqld.exe 2>nul
timeout /t 2 /nobreak >nul

net start Servidor_MariaDB 2>nul
net start MariaDB 2>nul
net start MySQL 2>nul
net start MaxiREST_SQL 2>nul
timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo [VERIFICACION FINAL]: Probando conexion con maxiprotocol...
%MYSQL_EXE% -P 3399 -u maxiprotocol -p"Maxi2026!*" -e "SELECT 'CONEXION EXITOSA' as ESTADO, COUNT(*) as TOTAL_MESAS FROM mx_10783.mxmes;" > "%LOGFILE%" 2>&1
type "%LOGFILE%"

echo.
echo ========================================================
echo   TODO LISTO! Ya puedes volver a la otra PC.
echo ========================================================
pause
popd
