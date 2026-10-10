@echo off
title MaxiProtocol Live Dashboard
echo ======================================================================
echo   MAXIPROTOCOL: SERVIDOR Y DASHBOARD EN TIEMPO REAL PARA MAXIREST POS
echo ======================================================================
echo.
echo Verificando entorno Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instale Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo Iniciando servidor en http://localhost:3000 ...
echo Presione Ctrl + C para detener el servidor en cualquier momento.
echo.
node server.js
pause
