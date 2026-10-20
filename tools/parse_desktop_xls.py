import os
import xlrd

files = ['111.xls', '222.xls', '3333.xls']
for f in files:
    full = os.path.join(r'C:\Users\Gardenias\Desktop', f)
    if not os.path.exists(full):
        continue
    print(f"\n==================== {f} ====================")
    try:
        wb = xlrd.open_workbook(full)
        for sidx, sname in enumerate(wb.sheet_names()):
            ws = wb.sheet_by_index(sidx)
            print(f"Sheet #{sidx}: {sname} (Rows: {ws.nrows}, Cols: {ws.ncols})")
            for r in range(min(40, ws.nrows)):
                row_vals = [str(ws.cell_value(r, c)).strip() for c in range(ws.ncols)]
                row_vals = [v for v in row_vals if v]
                if row_vals:
                    print(f"R{r+1}: {' | '.join(row_vals[:8])}")
    except Exception as e:
        print(f"Error reading {f}: {e}")
