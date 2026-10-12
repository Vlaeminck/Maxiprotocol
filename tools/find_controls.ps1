Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WindowFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    public static void ListWindowsForPid(uint targetPid) {
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetPid) {
                StringBuilder sbText = new StringBuilder(256);
                StringBuilder sbClass = new StringBuilder(256);
                GetWindowText(hWnd, sbText, 256);
                GetClassName(hWnd, sbClass, 256);
                Console.WriteLine(string.Format("HWND: 0x{0:X} | Class: {1} | Title: {2}", hWnd.ToInt64(), sbClass.ToString(), sbText.ToString()));

                EnumChildWindows(hWnd, (hChild, lChildParam) => {
                    StringBuilder sbChildText = new StringBuilder(256);
                    StringBuilder sbChildClass = new StringBuilder(256);
                    GetWindowText(hChild, sbChildText, 256);
                    GetClassName(hChild, sbChildClass, 256);
                    if (sbChildText.Length > 0 || sbChildClass.ToString().Contains("Edit")) {
                        Console.WriteLine(string.Format("   Child HWND: 0x{0:X} | Class: {1} | Text: '{2}'", hChild.ToInt64(), sbChildClass.ToString(), sbChildText.ToString()));
                    }
                    return true;
                }, IntPtr.Zero);
            }
            return true;
        }, IntPtr.Zero);
    }
}
"@

[WindowFinder]::ListWindowsForPid(4260)
