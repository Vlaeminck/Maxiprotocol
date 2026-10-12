const { execSync } = require('child_process');

console.log('=== BUSCANDO CADENAS DE CONEXIÓN EN LA MEMORIA DE MAXIREST (PID 4260) ===\n');

const psScript = `
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
        IntPtr hProcess = OpenProcess(0x0010 | 0x0020, false, pid); // PROCESS_VM_READ | PROCESS_VM_OPERATION
        if (hProcess == IntPtr.Zero) {
            Console.WriteLine("No se pudo abrir el proceso.");
            return;
        }

        IntPtr address = IntPtr.Zero;
        MEMORY_BASIC_INFORMATION mbi;

        byte[] search1 = Encoding.ASCII.GetBytes("3399");
        byte[] search2 = Encoding.ASCII.GetBytes("mx_10783");
        byte[] search3 = Encoding.ASCII.GetBytes("user_");
        byte[] search4 = Encoding.ASCII.GetBytes("PWD=");

        while (VirtualQueryEx(hProcess, address, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION))) != 0) {
            if (mbi.State == 0x1000 && (mbi.Protect == 0x04 || mbi.Protect == 0x02 || mbi.Protect == 0x20 || mbi.Protect == 0x40)) { // MEM_COMMIT & readable
                int size = (int)mbi.RegionSize;
                if (size > 0 && size < 10000000) {
                    byte[] buffer = new byte[size];
                    IntPtr read;
                    if (ReadProcessMemory(hProcess, mbi.BaseAddress, buffer, size, out read)) {
                        string text = Encoding.ASCII.GetString(buffer);
                        int idx = 0;
                        while ((idx = text.IndexOf("3399", idx)) != -1) {
                            int start = Math.Max(0, idx - 80);
                            int len = Math.Min(text.Length - start, 200);
                            string snippet = text.Substring(start, len).Replace('\\0', ' ').Replace('\\r', ' ').Replace('\\n', ' ');
                            Console.WriteLine("MATCH 3399: " + snippet);
                            idx += 4;
                        }

                        idx = 0;
                        while ((idx = text.IndexOf("mx_10783", idx)) != -1) {
                            int start = Math.Max(0, idx - 80);
                            int len = Math.Min(text.Length - start, 200);
                            string snippet = text.Substring(start, len).Replace('\\0', ' ').Replace('\\r', ' ').Replace('\\n', ' ');
                            Console.WriteLine("MATCH mx_10783: " + snippet);
                            idx += 8;
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

[MemoryScanner]::Scan(4260)
`;

try {
  const out = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(out);
} catch (e) {
  console.error('Error ejecutando scanner:', e.message);
}
