$pidToInspect = 4260

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class MemoryScanner {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int dwSize, out IntPtr lpNumberOfBytesRead);

    [DllImport("kernel32.dll")]
    public static extern int VirtualQueryEx(IntPtr hProcess, IntPtr lpAddress, out MEMORY_BASIC_INFORMATION lpBuffer, uint dwLength);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr hObject);

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

    public const int PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    public const int PROCESS_QUERY_INFORMATION = 0x0400;
    public const int PROCESS_VM_READ = 0x0010;
    public const uint MEM_COMMIT = 0x1000;
    public const uint PAGE_READWRITE = 0x04;
    public const uint PAGE_READONLY = 0x02;

    public static void ScanForString(int procId, string target) {
        IntPtr hProc = OpenProcess(0x1010, false, procId);
        if (hProc == IntPtr.Zero) {
            hProc = OpenProcess(0x0410, false, procId);
        }
        if (hProc == IntPtr.Zero) {
            Console.WriteLine("Cannot open process: " + Marshal.GetLastWin32Error());
            return;
        }

        byte[] targetBytes = Encoding.ASCII.GetBytes(target);
        long address = 0;
        long maxAddress = 0x7FFFFFFF; // 32-bit process limit

        MEMORY_BASIC_INFORMATION mbi;
        int foundCount = 0;

        while (address < maxAddress) {
            int ret = VirtualQueryEx(hProc, (IntPtr)address, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION)));
            if (ret == 0) break;

            if (mbi.State == MEM_COMMIT && (mbi.Protect == 0x04 || mbi.Protect == 0x02 || mbi.Protect == 0x20 || mbi.Protect == 0x40)) {
                int size = (int)mbi.RegionSize;
                if (size > 0 && size < 10000000) {
                    byte[] buffer = new byte[size];
                    IntPtr read;
                    if (ReadProcessMemory(hProc, mbi.BaseAddress, buffer, size, out read)) {
                        for (int i = 0; i <= (int)read - targetBytes.Length; i++) {
                            bool match = true;
                            for (int j = 0; j < targetBytes.Length; j++) {
                                if (buffer[i + j] != targetBytes[j]) {
                                    match = false;
                                    break;
                                }
                            }
                            if (match) {
                                foundCount++;
                                int start = Math.Max(0, i - 120);
                                int len = Math.Min((int)read - start, 240);
                                StringBuilder sb = new StringBuilder();
                                for (int k = 0; k < len; k++) {
                                    byte b = buffer[start + k];
                                    if (b >= 32 && b <= 126) sb.Append((char)b);
                                    else sb.Append(' ');
                                }
                                Console.WriteLine(string.Format("[MATCH #{0} at 0x{1:X}]: {2}", foundCount, (long)mbi.BaseAddress + i, sb.ToString().Trim()));
                                if (foundCount >= 10) {
                                    CloseHandle(hProc);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            address = (long)mbi.BaseAddress + (long)mbi.RegionSize;
        }

        CloseHandle(hProc);
        Console.WriteLine("Scan complete. Matches: " + foundCount);
    }
}
"@

[MemoryScanner]::ScanForString($pidToInspect, "mx_10783")
