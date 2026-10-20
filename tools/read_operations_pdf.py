import pdfplumber

pdf_path = r'C:\Users\Gardenias\Downloads\Detalle operaciones 14_10_2026 al 14_10_2026.pdf'
print(f"Reading {pdf_path}...")

with pdfplumber.open(pdf_path) as pdf:
    for page_idx, page in enumerate(pdf.pages):
        text = page.extract_text()
        print(f"\n--- PAGE {page_idx + 1} ---")
        print(text[:1500])
