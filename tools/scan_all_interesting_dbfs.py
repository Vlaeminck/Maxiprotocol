import os, glob

files = glob.glob(r'C:\MaxiRest\*.dbf')
print(f"Total DBFs: {len(files)}")

def read_dbf_summary(path):
    with open(path, 'rb') as f:
        h = f.read(32)
        count = int.from_bytes(h[4:8], 'little')
        hlen = int.from_bytes(h[8:10], 'little')
        rlen = int.from_bytes(h[10:12], 'little')
        fbytes = f.read(hlen - 32)
        fields = []
        off = 1
        for i in range(0, len(fbytes), 32):
            if fbytes[i] == 0x0D: break
            name = fbytes[i:i+11].split(b'\x00')[0].decode('ascii', errors='ignore').strip()
            flen = fbytes[i+16]
            fields.append((name, off, flen))
            off += flen
        
        # Check first record
        first_row = {}
        if count > 0:
            f.seek(hlen)
            rbuf = f.read(rlen)
            for name, o, l in fields[:8]:
                first_row[name] = rbuf[o:o+l].decode('latin1', errors='ignore').strip()
        return count, [x[0] for x in fields], first_row

for p in files:
    try:
        c, fnames, r = read_dbf_summary(p)
        fname = os.path.basename(p)
        if any(k in fnames for k in ['MOZO', 'NOMBREMOZ', 'COD_EMP', 'CUB', 'VENTAS', 'UNIDADES']):
            if c > 0 and fname not in ['45294870.dbf', '35522719.DBF']:
                print(f"\n{fname} ({c} recs): Fields={fnames[:8]}")
                print(f"  Sample: {r}")
    except:
        pass
