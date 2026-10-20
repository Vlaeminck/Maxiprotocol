import os, xlrd
from datetime import datetime, timedelta

def excel_date(val):
    try:
        f = float(val)
        base = datetime(1899, 12, 30)
        dt = base + timedelta(days=f)
        return dt.strftime('%Y-%m-%d')
    except:
        return str(val)

files = ['111.xls', '222.xls', '3333.xls']
for f in files:
    full = os.path.join(r'C:\Users\Gardenias\Desktop', f)
    wb = xlrd.open_workbook(full)
    ws = wb.sheet_by_index(0)
    headers = [str(ws.cell_value(0, c)).strip().lower() for c in range(ws.ncols)]
    print(f"\n==================== {f} (Cols: {headers}) ====================")
    
    dates = set()
    mozos = set()
    total_sales = 0
    total_items = 0
    
    # find col indexes
    f_idx = headers.index('fecha') if 'fecha' in headers else -1
    m_idx = headers.index('nombremoz') if 'nombremoz' in headers else -1
    art_idx = headers.index('nombreart') if 'nombreart' in headers else -1
    cant_idx = headers.index('cantidad') if 'cantidad' in headers else -1
    tot_idx = headers.index('total') if 'total' in headers else -1
    
    for r in range(1, ws.nrows):
        d_val = ws.cell_value(r, f_idx) if f_idx >= 0 else None
        d_str = excel_date(d_val)
        dates.add(d_str)
        
        m_val = str(ws.cell_value(r, m_idx)).strip() if m_idx >= 0 else ''
        if m_val: mozos.add(m_val)
        
        c_val = ws.cell_value(r, cant_idx) if cant_idx >= 0 else 0
        try: total_items += float(c_val)
        except: pass
        
        t_val = ws.cell_value(r, tot_idx) if tot_idx >= 0 else 0
        try: total_sales += float(t_val)
        except: pass
        
    print(f"Dates in {f}: {sorted(list(dates))}")
    print(f"Mozos in {f}: {sorted(list(mozos))}")
    print(f"Total rows: {ws.nrows - 1}, Total Items: {total_items}, Total Sales: ${total_sales:,.2f}")
    
    # Sample row
    print("Sample row 2:")
    for c in range(ws.ncols):
        print(f"  {headers[c]} = {ws.cell_value(1, c)}")
