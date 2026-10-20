$progIds = @('clave.sesion', 'clave.password', 'clave.boton', 'claver1.sesion', 'claver1.password')
foreach ($p in $progIds) {
    try {
        $obj = New-Object -ComObject $p
        Write-Host "SUCCESS creating ComObject: $p"
        $obj | Get-Member | Select-Object Name, MemberType | Format-Table
    } catch {
        Write-Host "Failed $p : $($_.Exception.Message)"
    }
}
