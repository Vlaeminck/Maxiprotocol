import os, glob

# Let's inspect all DBF headers in C:\MaxiRest
files = glob.glob(r'C:\MaxiRest\*.dbf')
print(f"Scanning {len(files)} DBFs for foreign keys to comprobantes...")

matches = []
for p in files:
    try:
        with open(p, 'rb') as f:
            h = f.read(32)
            count = int.from_bytes(h[4:8], 'little')
            if count == 0: continue
            hlen = int.from_bytes(h[8:10], 'little')
            rlen = int.from_bytes(h[10:12], 'little')
            fbytes = f.read(hlen - 32)
            fnames = []
            for i in range(0, len(fbytes), 32):
                if fbytes[i] == 0x0D: break
                name = fbytes[i:i+11].split(b'\x00')[0].decode('ascii', errors='ignore').strip()
                fnames.append(name.upper())
            
            # Check for fields that link to comprobantes
            cpb_keys = [fn for fn in fnames if any(k in fn for k in ['ID_CPB', 'ID_VENTA', 'ID_FAC', 'ID_PAPE', 'NUMERO', 'COMPROBANT', 'NRO_CPB'])]
            art_keys = [fn for fn in fnames if any(k in fn for k in ['ART', 'COD_ART', 'CODIGO', 'PLATO'])]
            
            if cpb_keys and art_keys:
                matches.append((os.path.basename(p), count, rlen, fnames))
    except:
        pass

print(f"Found {len(matches)} potential detail tables:")
for fname, count, rlen, fnames in matches:
    print(f"- {fname} ({count} recs, rlen={rlen}): {', '.join(fnames[:12])}")
