import os, glob

# Let's inspect the ID from 35522719.DBF
with open(r'C:\MaxiRest\35522719.DBF', 'rb') as f:
    h = f.read(32)
    hlen = int.from_bytes(h[8:10], 'little')
    rlen = int.from_bytes(h[10:12], 'little')
    f.seek(hlen)
    rec = f.read(rlen)
    # ID is 4 bytes at offset 1
    sample_id = int.from_bytes(rec[1:5], 'little')
    sample_fecha = rec[5:13].decode('latin1').strip()
    sample_num = int.from_bytes(rec[63:67], 'little')
    print(f"Sample from 35522719.DBF: ID={sample_id}, Fecha={sample_fecha}, Num={sample_num}")

# Now let's check the size of all DBFs in C:\MaxiRest
files = glob.glob(r'C:\MaxiRest\*.dbf')
files.sort(key=lambda x: os.path.getsize(x), reverse=True)

print("\nTop 20 largest DBFs in C:\MaxiRest:")
for p in files[:20]:
    size = os.path.getsize(p)
    fname = os.path.basename(p)
    with open(p, 'rb') as f:
        h = f.read(32)
        count = int.from_bytes(h[4:8], 'little')
        rlen = int.from_bytes(h[10:12], 'little')
        hlen = int.from_bytes(h[8:10], 'little')
        fbytes = f.read(hlen - 32)
        fnames = []
        for i in range(0, len(fbytes), 32):
            if fbytes[i] == 0x0D: break
            name = fbytes[i:i+11].split(b'\x00')[0].decode('ascii', errors='ignore').strip()
            fnames.append(name)
    print(f"- {fname}: {count} recs, {size:,} bytes | Fields: {', '.join(fnames[:10])}")
