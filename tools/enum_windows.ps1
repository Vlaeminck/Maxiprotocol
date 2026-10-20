
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
  $procId = [uint32]0
  [WinApi]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -match 'MAXIREST') {
    $sb = New-Object System.Text.StringBuilder 256
    [WinApi]::GetWindowText($hwnd, $sb, 256) | Out-Null
    $title = $sb.ToString()
    $visible = [WinApi]::IsWindowVisible($hwnd)
    $script:windows += [PSCustomObject]@{
      Hwnd = $hwnd
      Title = $title
      Visible = $visible
      Pid = $procId
    }
  }
  return $true
}, [IntPtr]::Zero) | Out-Null

$windows | Format-Table -AutoSize
