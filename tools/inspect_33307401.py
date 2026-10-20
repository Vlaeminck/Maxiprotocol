import os, sys

def inspect_dbf(path):
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
        for i in range(min(count, 10)):
            f.seek(hlen + i * rlen)
            rbuf = f.read(rlen)
            if rbuf[0] == 0x2A: continue
            row = {}
            for name, o, l in fields:
                row[name] = rbuf[o:o+l].decode('latin1', errors='ignore').strip()
            recs.append(row)
        return count, fields, recs

print("=== 33307401.dbf ===")
c, f, r = inspect_dbf(r'C:\MaxiRest\33307401.dbf')
print(f"Count: {c}")
print("Fields:", [x[0] for x in f])
for row in r[:3]:
    print(row)

# Let's check dates in 33307401.dbf
with open(r'C:\MaxiRest\33307401.dbf', 'rb') as f:
    h = f.read(32)
    count = int.from_bytes(h[4:8], 'little')
    hlen = int.from_bytes(h[8:10], 'little')
    rlen = int.from_bytes(h[10:12], 'little')
    dates = set()
    for i in range(count):
        f.seek(hlen + i * rlen)
        rbuf = f.read(rlen)
        if rbuf[0] == 0x2A: continue
        # FECHA is at offset 82, len 8
        d = rbuf[82:90].decode('latin1').strip()
        dates.add(d)
    print("Dates in 33307401.dbf:", sorted(list(dates)))
