
Add-Type @"
  using System;
  using System.Collections.Generic;
  using System.Runtime.InteropServices;
  using System.Text;

  public class WinFinder {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public static List<string> GetTitles() {
      List<string> titles = new List<string>();
      EnumWindows((hWnd, lParam) => {
        if (IsWindowVisible(hWnd)) {
          StringBuilder sb = new StringBuilder(512);
          GetWindowText(hWnd, sb, 512);
          string t = sb.ToString().Trim();
          if (!string.IsNullOrEmpty(t)) {
            titles.Add(t);
          }
        }
        return true;
      }, IntPtr.Zero);
      return titles;
    }
  }
"@

[WinFinder]::GetTitles()
