import os

def read_dbf_sample(path):
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
        
        recs = []
        for i in range(min(count, 15)):
            f.seek(hlen + i * rlen)
            rbuf = f.read(rlen)
            if rbuf[0] == 0x2A: continue
            row = {}
            for name, o, l in fields:
                row[name] = rbuf[o:o+l].decode('latin1', errors='ignore').strip()
            recs.append(row)
        return count, fields, recs

sample_files = ['30215837.dbf', '33371579.dbf', '37586273.dbf', '45333292.dbf', '49710517.dbf']
for sf in sample_files:
    full = os.path.join(r'C:\MaxiRest', sf)
    if os.path.exists(full):
        c, f, recs = read_dbf_sample(full)
        print(f"\n=== {sf} ({c} recs) ===")
        for r in recs[:5]:
            print(r)
