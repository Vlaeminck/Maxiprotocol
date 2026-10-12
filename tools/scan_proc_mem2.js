const { execSync } = require('child_process');

console.log('=== ESCANEANDO MEMORIA DE MAXIREST CON PROCESS_QUERY_INFORMATION ===\n');

const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.IO;

public class Scanner {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int dwSize, out IntPtr lpNumberOfBytesRead);

    [DllImport("kernel32.dll", SetLastError = true)]
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

    public static void FindStrings(int pid) {
        // 0x0400 = PROCESS_QUERY_INFORMATION, 0x0010 = PROCESS_VM_READ, 0x1000 = PROCESS_QUERY_LIMITED_INFORMATION
        IntPtr h = OpenProcess(0x0430, false, pid);
        if (h == IntPtr.Zero) {
            Console.WriteLine("Error OpenProcess: " + Marshal.GetLastWin32Error());
            return;
        }

        IntPtr addr = IntPtr.Zero;
        MEMORY_BASIC_INFORMATION mbi;
        int found = 0;

        while (VirtualQueryEx(h, addr, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION))) != 0) {
            if (mbi.State == 0x1000 && (mbi.Protect == 0x04 || mbi.Protect == 0x02 || mbi.Protect == 0x20 || mbi.Protect == 0x40)) {
                int sz = (int)mbi.RegionSize;
                if (sz > 0 && sz < 20000000) {
                    byte[] buf = new byte[sz];
                    IntPtr read;
                    if (ReadProcessMemory(h, mbi.BaseAddress, buf, sz, out read)) {
                        string s = Encoding.ASCII.GetString(buf);
                        
                        // Buscar SERVER= o mx_10783 o user_10783
                        string[] targets = new string[] { "SERVER=", "PORT=3399", "user_10783", "mx_10783", "DATABASE=mx_", "UID=user_" };
                        foreach (var target in targets) {
                            int idx = 0;
                            while ((idx = s.IndexOf(target, idx, StringComparison.OrdinalIgnoreCase)) != -1) {
                                int st = Math.Max(0, idx - 40);
                                int len = Math.Min(s.Length - st, 160);
                                string snippet = s.Substring(st, len).Replace('\\0', ' ').Replace('\\r', ' ').Replace('\\n', ' ');
                                Console.WriteLine("FOUND [" + target + "]: " + snippet);
                                found++;
                                idx += target.Length;
                            }
                        }
                    }
                }
            }
            long next = mbi.BaseAddress.ToInt64() + mbi.RegionSize.ToInt64();
            if (next <= addr.ToInt64()) break;
            addr = new IntPtr(next);
        }
        Console.WriteLine("Total matches encontrados: " + found);
    }
}
"@

[Scanner]::FindStrings(4260)
`;

try {
  const out = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(out);
} catch (e) {
  console.log('Error:', e.message);
}
