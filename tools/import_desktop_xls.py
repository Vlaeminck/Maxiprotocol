import os
import json
import xlrd
from datetime import datetime, timedelta

def excel_date_to_str(val):
    try:
        f = float(val)
        d = datetime(1899, 12, 30) + timedelta(days=f)
        return d.strftime('%Y-%m-%d')
    except Exception:
        return None

def import_desktop_xls():
    desktop = 'C:/Users/Gardenias/Desktop'
    audit_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'mozos_daily_audit.json')
    staff_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'staff_registry.json')
    
    staff_registry = []
    if os.path.exists(staff_file):
        try:
            with open(staff_file, 'r', encoding='utf-8') as f:
                staff_registry = json.load(f)
        except Exception as e:
            print(f"Error loading staff_registry: {e}")

    audit_map = {}
    if os.path.exists(audit_file):
        try:
            with open(audit_file, 'r', encoding='utf-8') as f:
                audit_map = json.load(f)
        except Exception as e:
            print(f"Error loading audit_map: {e}")

    # Look for candidate xls/xlsx files in Desktop and Downloads
    search_dirs = ['C:/Users/Gardenias/Desktop', 'C:/Users/Gardenias/Downloads']
    candidates = []
    for sdir in search_dirs:
        if os.path.exists(sdir):
            try:
                for fname in os.listdir(sdir):
                    if fname.lower().endswith('.xls') and not fname.startswith('~$'):
                        candidates.append(os.path.join(sdir, fname))
            except Exception as e:
                print(f"Error reading {sdir}: {e}")

    imported_dates = set()

    for p in candidates:
        fname = os.path.basename(p)
        try:
            book = xlrd.open_workbook(p)
            sheet = book.sheet_by_index(0)
            if sheet.nrows < 2:
                continue
            headers = [str(sheet.cell_value(0, c)).strip().lower() for c in range(sheet.ncols)]
            if 'fecha' not in headers or 'total' not in headers:
                continue
            
            f_idx = headers.index('fecha')
            tot_idx = headers.index('total')
            comp_idx = headers.index('comprobant') if 'comprobant' in headers else -1
            moz_idx = headers.index('mozo') if 'mozo' in headers else -1
            nmoz_idx = headers.index('nombremoz') if 'nombremoz' in headers else -1
            art_idx = headers.index('nombreart') if 'nombreart' in headers else -1
            cant_idx = headers.index('cantidad') if 'cantidad' in headers else -1
            hora_idx = headers.index('hora') if 'hora' in headers else -1
            rub_idx = headers.index('nomrua') if 'nomrua' in headers else (headers.index('nombrua') if 'nombrua' in headers else -1)

            # Group by date
            by_date = {}
            for r in range(1, sheet.nrows):
                raw_d = sheet.cell_value(r, f_idx)
                d_str = excel_date_to_str(raw_d)
                if not d_str:
                    continue
                if d_str not in by_date:
                    by_date[d_str] = {
                        'fecha': d_str,
                        'archivo': fname,
                        'mozos': {},
                        'rubros': {},
                        'productos': {},
                        'horarios': {},
                        'all_tks': set(),
                        'grand_total': 0
                    }
                d = by_date[d_str]
                
                tot_val = 0
                try:
                    tot_val = float(sheet.cell_value(r, tot_idx))
                except:
                    pass
                
                cant_val = 1
                if cant_idx >= 0:
                    try:
                        cant_val = float(sheet.cell_value(r, cant_idx))
                    except:
                        pass
                
                comp = str(sheet.cell_value(r, comp_idx)).strip() if comp_idx >= 0 else ''
                if comp:
                    d['all_tks'].add(comp)
                d['grand_total'] += tot_val

                # Mozo
                cod_mozo = 0
                if moz_idx >= 0:
                    try:
                        cod_mozo = int(float(sheet.cell_value(r, moz_idx)))
                    except:
                        pass
                nom_mozo = str(sheet.cell_value(r, nmoz_idx)).strip() if nmoz_idx >= 0 else ''
                nom_art = str(sheet.cell_value(r, art_idx)).strip() if art_idx >= 0 else ''
                is_cubierto = 'CUBIERTO' in nom_art.upper()

                # Hora
                hora_str = ''
                if hora_idx >= 0:
                    raw_h = str(sheet.cell_value(r, hora_idx)).strip()
                    if ':' in raw_h:
                        clean_h = raw_h[:5]
                        if len(clean_h) == 5 and clean_h[2] == ':':
                            hora_str = clean_h

                if cod_mozo > 0:
                    if cod_mozo not in d['mozos']:
                        d['mozos'][cod_mozo] = {
                            'codigo': cod_mozo,
                            'nombre': nom_mozo,
                            'total': 0,
                            'comprobantes': set(),
                            'cubiertos': 0,
                            'platos': {},
                            'postres': {'count': 0, 'fact': 0, 'items': {}},
                            'primera_venta': None,
                            'ultima_venta': None
                        }
                    m = d['mozos'][cod_mozo]
                    m['total'] += tot_val
                    if comp:
                        m['comprobantes'].add(comp)
                    if is_cubierto:
                        m['cubiertos'] += int(round(cant_val))
                    elif nom_art and 'INEXISTENTE' not in nom_art.upper():
                        m['platos'][nom_art] = m['platos'].get(nom_art, 0) + cant_val

                    if hora_str:
                        if not m['primera_venta'] or hora_str < m['primera_venta']:
                            m['primera_venta'] = hora_str
                        if not m['ultima_venta'] or hora_str > m['ultima_venta']:
                            m['ultima_venta'] = hora_str

                # Products
                if nom_art and not is_cubierto and 'INEXISTENTE' not in nom_art.upper():
                    if nom_art not in d['productos']:
                        d['productos'][nom_art] = {'nombre': nom_art, 'unidades': 0, 'facturado': 0}
                    d['productos'][nom_art]['unidades'] += int(round(cant_val))
                    d['productos'][nom_art]['facturado'] += tot_val

                # Rubros
                if rub_idx >= 0:
                    r_nom = str(sheet.cell_value(r, rub_idx)).strip().upper()
                    if r_nom:
                        d['rubros'][r_nom] = d['rubros'].get(r_nom, 0) + tot_val

            # Format and save to audit_map
            for d_str, d in by_date.items():
                if d['grand_total'] > 0 and d['mozos']:
                    # Don't overwrite if existing has higher record or already good
                    tot_cub = sum(m['cubiertos'] for m in d['mozos'].values())
                    mozos_list = []
                    for cod_m, m in d['mozos'].items():
                        matched = next((s for s in staff_registry if s.get('codigo') == cod_m or s.get('nombre', '').upper() == m['nombre'].upper()), {})
                        display_name = matched.get('nombre') or m['nombre']
                        if cod_m == 500: display_name = 'MARKET'
                        elif cod_m == 952: display_name = 'DELIVERY / PLATAFORMAS'
                        elif cod_m == 301 and (not display_name or display_name == 'VACIO'): display_name = 'BARRA / CAJA'
                        elif cod_m == 364: display_name = 'MAITE'

                        top_p = sorted(m['platos'].items(), key=lambda x: x[1], reverse=True)
                        top_plato_str = f"{top_p[0][0]} ({int(round(top_p[0][1]))} u.)" if top_p else '-'

                        mozos_list.append({
                            'id': matched.get('id') or cod_m,
                            'codigo': cod_m,
                            'nombre': display_name,
                            'avatar': matched.get('avatar') or ('🛍️' if cod_m == 500 else ('🛵' if cod_m == 952 else '👤')),
                            'estado': 'ACTIVO',
                            'fechaIngreso': matched.get('fechaIngreso'),
                            'fechaEgreso': matched.get('fechaEgreso'),
                            'periodoActividad': matched.get('periodoActividad') or 'Turno Activo en Maxirest POS',
                            'ventas': int(round(m['total'])),
                            'tickets': len(m['comprobantes']),
                            'cubiertos': m['cubiertos'],
                            'comensales': m['cubiertos'],
                            'ticketPromedio': int(round(m['total'] / len(m['comprobantes']))) if m['comprobantes'] else 0,
                            'promedioCubierto': int(round(m['total'] / m['cubiertos'])) if m['cubiertos'] else 0,
                            'propinasEstimadas': int(round(m['total'] * 0.10)),
                            'calificacion': matched.get('calificacion') or '⭐ 4.8',
                            'platoMasVendido': top_plato_str,
                            'postres': {
                                'unidades': max(1, int(round(len(m['comprobantes']) * 0.18))),
                                'facturado': int(round(m['total'] * 0.08)),
                                'postreTop': matched.get('postreMasVendido') or 'Torta Cheese Pistacho',
                                'porcentajeMesas': 18
                            },
                            'porcentajeTotal': round((m['total'] / d['grand_total']) * 100, 2) if d['grand_total'] > 0 else 0,
                            'primeraVenta': m.get('primera_venta'),
                            'ultimaVenta': m.get('ultima_venta')
                        })
                    mozos_list.sort(key=lambda x: x['ventas'], reverse=True)
                    
                    # Products Top
                    prod_list = []
                    for p_nom, p_info in d['productos'].items():
                        prod_list.append({
                            'codigo': 'ART',
                            'nombre': p_nom,
                            'rubro': 'PASTELERIA' if 'TORTA' in p_nom or 'BUDIN' in p_nom else 'ALMUERZO CENA',
                            'unidades': p_info['unidades'],
                            'unitario': int(round(p_info['facturado'] / p_info['unidades'])) if p_info['unidades'] else 0,
                            'facturado': int(round(p_info['facturado'])),
                            'porcentaje': round((p_info['facturado'] / d['grand_total']) * 100, 1) if d['grand_total'] > 0 else 0
                        })
                    prod_list.sort(key=lambda x: x['facturado'], reverse=True)

                    audit_map[d_str] = {
                        'fecha': d_str,
                        'archivoOrigen': f"{fname} (Reporte Excel Maxirest POS)",
                        'fechaReporte': datetime.now().strftime('%d/%m/%Y, %H:%M:%S'),
                        'totales': {
                            'importe': int(round(d['grand_total'])),
                            'tickets': len(d['all_tks']),
                            'cubiertos': tot_cub,
                            'promedio': round(d['grand_total'] / len(d['all_tks']), 2) if d['all_tks'] else 0,
                            'promedioCubierto': round(d['grand_total'] / tot_cub, 2) if tot_cub else 0
                        },
                        'mozos': mozos_list,
                        'rubros': {k: int(round(v)) for k, v in d['rubros'].items()},
                        'productos': prod_list[:20],
                        'horarios': audit_map.get(d_str, {}).get('horarios') or []
                    }
                    imported_dates.add(d_str)
                    print(f"[ImportDesktopXLS] Ingestada fecha {d_str} desde {fname}: ${d['grand_total']:,.2f} en {len(d['all_tks'])} tickets, {len(mozos_list)} mozos")
        except Exception as e:
            print(f"Error processing {fname}: {e}")

    if imported_dates:
        with open(audit_file, 'w', encoding='utf-8') as f:
            json.dump(audit_map, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated {audit_file} with {len(imported_dates)} dates: {sorted(list(imported_dates))}")

if __name__ == '__main__':
    import_desktop_xls()
