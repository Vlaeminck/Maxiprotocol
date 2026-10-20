const fs = require('fs');
const { execSync } = require('child_process');

// Script to test finding MAXIREST window handles
const psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;

  public class WinApi {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
  }
"@

$windows = @()
[WinApi]::EnumWindows({
  param($hwnd, $lparam)
  $pid = 0
  [WinApi]::GetWindowThreadProcessId($hwnd, [ref]$pid)
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -match 'MAXIREST') {
    $sb = New-Object System.Text.StringBuilder 256
    [WinApi]::GetWindowText($hwnd, $sb, 256)
    $title = $sb.ToString()
    $visible = [WinApi]::IsWindowVisible($hwnd)
    $script:windows += [PSCustomObject]@{
      Hwnd = $hwnd
      Title = $title
      Visible = $visible
      Pid = $pid
    }
  }
  return $true
}, [IntPtr]::Zero)

$windows | Format-Table -AutoSize
`;

fs.writeFileSync('C:/Users/Gardenias/Desktop/DEVS/Maxiprotocol/Maxiprotocol/tools/enum_windows.ps1', psScript);

try {
  const out = execSync('powershell -ExecutionPolicy Bypass -File tools/enum_windows.ps1', { stdio: 'pipe' }).toString();
  console.log('MAXIREST Windows:');
  console.log(out);
} catch(e) {
  console.log('Error:', e.message);
}
