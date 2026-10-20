import os, glob

# Search in C:\MaxiRest, C:\MaxiREST_SQL, C:\Users\Gardenias\Desktop, C:\Users\Gardenias\Downloads
target_dirs = [
    r'C:\MaxiRest',
    r'C:\MaxiREST_SQL',
    r'C:\Users\Gardenias\Desktop',
    r'C:\Users\Gardenias\Downloads'
]

print("Searching for files containing 'BELEN' and '14/10' or '20261014'...")
found_files = []
for d in target_dirs:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.dbf', '.xls', '.xlsx', '.csv', '.txt', '.log']:
                p = os.path.join(root, f)
                try:
                    with open(p, 'rb') as fp:
                        content = fp.read()
                        if b'BELEN' in content and (b'20261014' in content or b'14/10/2026' in content or b'14/10/26' in content):
                            found_files.append((p, len(content)))
                except:
                    pass

print(f"Found {len(found_files)} matches:")
for p, s in found_files:
    print(f"- {p} ({s} bytes)")
