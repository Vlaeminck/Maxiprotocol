$targetPid = (Get-Process -Name MAXIREST -ErrorAction SilentlyContinue | Select-Object -First 1).Id
if (-not $targetPid) {
    Write-Output "MAXIREST not running"
    exit
}
Write-Output "Scanning MAXIREST PID: $targetPid"

$dumpPath = Join-Path $PSScriptRoot "maxirest_minidump.dmp"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NativeMem {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

    [DllImport("dbghelp.dll", SetLastError = true)]
    public static extern bool MiniDumpWriteDump(IntPtr hProcess, int processId, IntPtr hFile, int dumpType, IntPtr expParam, IntPtr userStreamParam, IntPtr callbackParam);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);
}
"@

$hProc = [NativeMem]::OpenProcess(0x1F0FFF, $false, $targetPid)
if ($hProc -eq [IntPtr]::Zero) {
    Write-Output "Failed to open process: $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    exit
}

$fs = New-Object System.IO.FileStream($dumpPath, [System.IO.FileMode]::Create)
$res = [NativeMem]::MiniDumpWriteDump($hProc, $targetPid, $fs.SafeFileHandle.DangerousGetHandle(), 2, [IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero)
$fs.Close()
[NativeMem]::CloseHandle($hProc)

Write-Output "Dump created: $res, size: $((Get-Item $dumpPath).Length)"
