Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class MemoryScanner {
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll")]
    public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int dwSize, out IntPtr lpNumberOfBytesRead);

    [DllImport("kernel32.dll")]
    public static extern int VirtualQueryEx(IntPtr hProcess, IntPtr lpAddress, out MEMORY_BASIC_INFORMATION lpBuffer, uint dwLength);

    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORY_BASIC_INFORMATION {
        public IntPtr BaseAddress;
        public IntPtr AllocationBase;
        public uint AllocationProtect;
        public IntPtr RegionSize;
        public uint State;
        public uint Protect;
        public uint Type;
    }

    public static void Scan(int pid) {
        IntPtr hProcess = OpenProcess(0x0410, false, pid); // PROCESS_QUERY_INFORMATION | PROCESS_VM_READ
        if (hProcess == IntPtr.Zero) {
            Console.WriteLine("Could not open process " + pid);
            return;
        }

        IntPtr address = IntPtr.Zero;
        MEMORY_BASIC_INFORMATION mbi;

        while (VirtualQueryEx(hProcess, address, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION))) != 0) {
            if (mbi.State == 0x1000 && (mbi.Protect == 0x04 || mbi.Protect == 0x02 || mbi.Protect == 0x20 || mbi.Protect == 0x40)) {
                int size = (int)mbi.RegionSize;
                if (size > 0 && size < 15000000) {
                    byte[] buffer = new byte[size];
                    IntPtr read;
                    if (ReadProcessMemory(hProcess, mbi.BaseAddress, buffer, size, out read)) {
                        string text = Encoding.ASCII.GetString(buffer);
                        
                        // Look for connection string or credentials
                        string[] patterns = new string[] { "SERVER=", "DATABASE=mx_10783", "UID=user_10783", "PWD=", "DRIVER={MySQL", "3399" };
                        foreach (string p in patterns) {
                            int idx = 0;
                            while ((idx = text.IndexOf(p, idx, StringComparison.OrdinalIgnoreCase)) != -1) {
                                int start = Math.Max(0, idx - 100);
                                int len = Math.Min(text.Length - start, 250);
                                string snippet = text.Substring(start, len).Replace('\0', ' ').Replace('\r', ' ').Replace('\n', ' ');
                                Console.WriteLine("FOUND [" + p + "]: " + snippet);
                                idx += p.Length + 1;
                            }
                        }
                    }
                }
            }
            long nextAddr = mbi.BaseAddress.ToInt64() + mbi.RegionSize.ToInt64();
            if (nextAddr <= address.ToInt64()) break;
            address = new IntPtr(nextAddr);
        }
    }
}
"@

$proc = Get-Process -Name MAXIREST -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Scanning MAXIREST PID $($proc.Id)..."
    [MemoryScanner]::Scan($proc.Id)
} else {
    Write-Host "MAXIREST process not found."
}
