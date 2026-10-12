const fs = require('fs');
const { execSync } = require('child_process');

// PowerShell script to scan process memory of MAXIREST.EXE
const psScript = `
$targetPid = (Get-Process -Name MAXIREST -ErrorAction SilentlyContinue | Select-Object -First 1).Id
if (-not $targetPid) {
    Write-Output "MAXIREST not running"
    exit
}
Write-Output "Scanning MAXIREST PID: $targetPid"

$dumpPath = "$PSScriptRoot\\maxirest_minidump.dmp"
Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class MiniDump {
    [DllImport("dbghelp.dll")]
    public static extern bool MiniDumpWriteDump(IntPtr hProcess, int processId, IntPtr hFile, int dumpType, IntPtr expParam, IntPtr userStreamParam, IntPtr callbackParam);
}
"@

$proc = [System.Diagnostics.Process]::GetProcessById($targetPid)
$fs = New-Object System.IO.FileStream($dumpPath, [System.IO.FileMode]::Create)
$res = [MiniDump]::MiniDumpWriteDump($proc.Handle, $targetPid, $fs.SafeFileHandle.DangerousGetHandle(), 2, [IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero)
$fs.Close()

Write-Output "Dump created: $res, size: $((Get-Item $dumpPath).Length)"
`;

fs.writeFileSync('tools/dump_proc.ps1', psScript);
console.log('Script tools/dump_proc.ps1 written.');
