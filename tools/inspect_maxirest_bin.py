with open(r'C:\MaxiREST_SQL\MAXIREST.EXE', 'rb') as f:
    data = f.read()

print("Searching MAXIREST.EXE for command line arguments or report execution...")
import re
switches = set(re.findall(rb'/[a-zA-Z0-9\?]+', data))
print("Switches found:", [s.decode() for s in list(switches)[:30]])

# Search for "vtasmozodet"
idx = data.find(b'vtasmozodet')
if idx != -1:
    print(f"Found vtasmozodet in binary at {idx}!")
    print(data[max(0, idx-100):min(len(data), idx+200)])
else:
    print("vtasmozodet not found in MAXIREST.EXE binary directly.")
