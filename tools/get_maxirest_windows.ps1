Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinInfo {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
}
'@

$targetPid = (Get-Process -Name MAXIREST -ErrorAction SilentlyContinue | Select-Object -First 1).Id
Write-Output "Checking PID: $targetPid"

[WinInfo]::EnumWindows({
    param($hwnd, $lparam)
    $p = 0
    [WinInfo]::GetWindowThreadProcessId($hwnd, [ref]$p)
    if ($p -eq $targetPid -and [WinInfo]::IsWindowVisible($hwnd)) {
        $sb = New-Object System.Text.StringBuilder 256
        [WinInfo]::GetWindowText($hwnd, $sb, 256)
        $t = $sb.ToString()
        if ($t) { Write-Output "HWND: $hwnd | Title: '$t'" }
    }
    return $true
}, [IntPtr]::Zero)
