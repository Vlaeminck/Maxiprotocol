$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open('C:\Users\Gardenias\Desktop\111.xls')
    $ws = $wb.Sheets.Item(1)
    Write-Host "Sheet Name: $($ws.Name)"
    $maxRows = $ws.UsedRange.Rows.Count
    Write-Host "Total Rows: $maxRows"
    
    # Scan all rows and collect mozos
    $mozosEncontrados = @{}
    for ($r = 1; $r -le $maxRows; $r++) {
        $rowVals = @()
        for ($c = 1; $c -le 12; $c++) {
            $v = $ws.Cells.Item($r, $c).Text
            if ($v) { $rowVals += $v }
        }
        $line = $rowVals -join ' | '
        if ($line -match "Mozo" -or $line -match "ROCIO" -or $line -match "BELEN" -or $line -match "MARINA" -or $line -match "ADRIANA" -or $line -match "MARKET" -or $line -match "982" -or $line -match "315" -or $line -match "984" -or $line -match "Total general") {
            Write-Host "Row $r : $line"
        }
    }
    $wb.Close($false)
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
