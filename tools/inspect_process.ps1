$ErrorActionPreference = "Continue"

Write-Host "=== INSPECCIONANDO PROCESO MAXIREST.EXE ==="

$proc = Get-Process -Name "MAXIREST" -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Host "No se encontro MAXIREST en ejecucion."
    exit
}

Write-Host "PID: $($proc.Id)"
Write-Host "Ventana: $($proc.MainWindowTitle)"
Write-Host "Ruta: $($proc.Path)"
Write-Host "Inicio: $($proc.StartTime)"

Write-Host "`n--- Modulos Cargados (DLLs clave) ---"
$proc.Modules | Where-Object { 
    $_.ModuleName -match "my|maria|odbc|socket|comm|firebird|fb" 
} | Select-Object ModuleName, FileName | Format-Table -AutoSize

Write-Host "`n--- Conexiones de Red de este proceso ---"
Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
    Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State | Format-Table -AutoSize
