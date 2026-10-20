
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;

  public class WinUtils {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
  }
"@

$list = @()
[WinUtils]::EnumWindows({
  param($hwnd, $lparam)
  if ([WinUtils]::IsWindowVisible($hwnd)) {
    $sb = New-Object System.Text.StringBuilder 512
    [WinUtils]::GetWindowText($hwnd, $sb, 512) | Out-Null
    $title = $sb.ToString()
    if ($title -and $title.Trim().Length -gt 0) {
      $script:list += [PSCustomObject]@{ Hwnd = $hwnd; Title = $title }
    }
  }
  return $true
}, [IntPtr]::Zero) | Out-Null

$list | Format-Table -AutoSize
