import os

def read_dbf_all(path):
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
        for i in range(count):
            f.seek(hlen + i * rlen)
            rbuf = f.read(rlen)
            if rbuf[0] == 0x2A: continue
            row = {}
            for name, o, l in fields:
                row[name] = rbuf[o:o+l].decode('latin1', errors='ignore').strip()
            recs.append(row)
        return fields, recs

f, r = read_dbf_all(r'C:\MaxiRest\35371505.dbf')
print("35371505.dbf records:")
for row in r:
    print(row)
