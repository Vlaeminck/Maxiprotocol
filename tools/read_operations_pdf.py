import glob
import os
import pdfplumber

for p in sorted(glob.glob(r'C:\Users\Gardenias\Downloads\Detalle operaciones*.pdf')):
    fname = os.path.basename(p)
    with pdfplumber.open(p) as pdf:
        text0 = pdf.pages[0].extract_text()
        lines = [line.strip() for line in text0.split('\n') if line.strip()]
        print(f"=== {fname} ===")
        for i, l in enumerate(lines[:12]):
            print(f"  {l}")

