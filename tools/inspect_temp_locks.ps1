$tempDir = [System.IO.Path]::GetTempPath()
$tmpFiles = Get-ChildItem -Path $tempDir -Filter "*.TMP" | Sort-Object LastWriteTime -Descending | Select-Object -First 10

foreach ($f in $tmpFiles) {
    try {
        $stream = [System.IO.File]::Open($f.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $reader = New-Object System.IO.BinaryReader($stream)
        $bytes = $reader.ReadBytes([Math]::Min(1000000, [int]$stream.Length))
        $stream.Close()

        $text = [System.Text.Encoding]::GetEncoding("latin1").GetString($bytes)
        $matches = @()
        foreach ($q in @("SANTI", "981", "EMPLEAD", "MOZO", "NOMBRE", "FECHA")) {
            if ($text.IndexOf($q) -ne -1) { $matches += $q }
        }
        Write-Host "File: $($f.Name) ($($f.Length) bytes, $($f.LastWriteTime)) -> Matches: $($matches -join ', ')"
        if ($matches.Contains("SANTI") -or $matches.Contains("981")) {
            $idx = $text.IndexOf("SANTI")
            if ($idx -ne -1) {
                $start = [Math]::Max(0, $idx - 50)
                $len = [Math]::Min($text.Length - $start, 150)
                Write-Host "  Snippet: $($text.Substring($start, $len) -replace '\0', ' ')"
            }
        }
    } catch {
        Write-Host "Could not read $($f.Name): $($_.Exception.Message)"
    }
}
