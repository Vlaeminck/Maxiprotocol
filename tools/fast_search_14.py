import os

target_dirs = [
    r'C:\MaxiRest',
    r'C:\MaxiREST_SQL',
    r'C:\Users\Gardenias\Desktop',
    r'C:\Users\Gardenias\Downloads'
]

print("Targeted search for 14/10/2026 sales files...")
found = []
for d in target_dirs:
    if not os.path.exists(d): continue
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if not os.path.isfile(p): continue
        size = os.path.getsize(p)
        if size > 25 * 1024 * 1024: continue
        ext = os.path.splitext(f)[1].lower()
        if ext in ['.dbf', '.xls', '.xlsx', '.csv', '.txt']:
            try:
                with open(p, 'rb') as fp:
                    data = fp.read()
                    if (b'20261014' in data or b'14/10/2026' in data or b'14/10/26' in data) and (b'BELEN' in data or b'984' in data):
                        found.append((p, size))
            except:
                pass

print(f"Found {len(found)} matching files:")
for p, s in found:
    print(f"- {p} ({s} bytes)")
