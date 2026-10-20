$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $fileList = @('111.xls', '222.xls', '3333.xls')
  foreach ($fname in $fileList) {
    $fullPath = "C:\Users\Gardenias\Desktop\$fname"
    if (Test-Path $fullPath) {
      $wb = $excel.Workbooks.Open($fullPath)
      $ws = $wb.Sheets.Item(1)
      $rowCount = $ws.UsedRange.Rows.Count
      Write-Host "=========================================="
      Write-Host "FILE: $fname | Total Rows: $rowCount"
      $limit = [Math]::Min(35, $rowCount)
      for ($r = 1; $r -le $limit; $r++) {
        $rowVals = @()
        for ($c = 1; $c -le 10; $c++) {
          $val = $ws.Cells.Item($r, $c).Text
          if ($val -ne $null -and $val.Trim() -ne '') {
            $rowVals += $val.Trim()
          }
        }
        if ($rowVals.Count -gt 0) {
          Write-Host ("R" + $r + ": " + ($rowVals -join " | "))
        }
      }
      $wb.Close($false)
    }
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)"
} finally {
  $excel.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
