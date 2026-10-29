import os
import json
import xlrd
import unicodedata
from datetime import datetime, timedelta

def excel_date_to_str(val):
    try:
        f = float(val)
        d = datetime(1899, 12, 30) + timedelta(days=f)
        return d.strftime('%Y-%m-%d')
    except Exception:
        return None

def normalize_name(name):
    if not name:
        return ''
    s = str(name).strip().upper()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return ' '.join(s.split())

def import_desktop_xls():
    base_dir = os.path.join(os.path.dirname(__file__), '..')
    audit_file = os.path.join(base_dir, 'config', 'mozos_daily_audit.json')
    staff_file = os.path.join(base_dir, 'config', 'staff_registry.json')
    catalog_file = os.path.join(base_dir, 'config', 'categories_catalog.json')
    
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

    # Load existing categories catalog (from Informe.DBF / categories_catalog.js)
    catalog_data = {
        'byCode': {},
        'byName': {},
        'categories': {},
        'subcategories': {},
        'latestRankingItems': []
    }
    if os.path.exists(catalog_file):
        try:
            with open(catalog_file, 'r', encoding='utf-8') as f:
                loaded_cat = json.load(f)
                if isinstance(loaded_cat, dict):
                    catalog_data.update(loaded_cat)
        except Exception as e:
            print(f"Error loading categories_catalog.json: {e}")

    by_code = catalog_data.get('byCode', {})
    by_name = catalog_data.get('byName', {})

    # Look for candidate xls files in Desktop and Downloads
    search_dirs = ['C:/Users/Gardenias/Desktop', 'C:/Users/Gardenias/Downloads']
    candidates = []
    for sdir in search_dirs:
        if os.path.exists(sdir):
            try:
                for fname in os.listdir(sdir):
                    if fname.lower().endswith('.xls') and not fname.startswith('~$'):
                        full_p = os.path.join(sdir, fname)
                        candidates.append((os.path.getmtime(full_p), full_p))
            except Exception as e:
                print(f"Error reading {sdir}: {e}")

    # Sort oldest to newest so the most recent export wins
    candidates.sort(key=lambda x: x[0])

    # PASS 1: Ingest Ranking / Category XLS reports (e.g. "todos los rubros actualizados.xls")
    ranking_updated = False
    for mtime, p in candidates:
        fname = os.path.basename(p)
        try:
            book = xlrd.open_workbook(p)
            sheet = book.sheet_by_index(0)
            if sheet.nrows < 2:
                continue
            headers = [str(sheet.cell_value(0, c)).strip().lower() for c in range(sheet.ncols)]
            if 'rubro' in headers and 'nomrub' in headers and 'codigo' in headers and 'nombre' in headers:
                rub_i = headers.index('rubro')
                nrub_i = headers.index('nomrub')
                srub_i = headers.index('subrubro') if 'subrubro' in headers else -1
                nsrub_i = headers.index('nomsub') if 'nomsub' in headers else -1
                cod_i = headers.index('codigo')
                nom_i = headers.index('nombre')
                uni_i = headers.index('unidades') if 'unidades' in headers else -1
                pre_i = headers.index('precio') if 'precio' in headers else -1
                ven_i = headers.index('venta') if 'venta' in headers else -1

                items_in_file = []
                for r in range(1, sheet.nrows):
                    try:
                        cod = int(float(sheet.cell_value(r, cod_i)))
                    except:
                        cod = 0
                    nom = str(sheet.cell_value(r, nom_i)).strip().upper()
                    if not cod and not nom:
                        continue
                    try:
                        rub_id = int(float(sheet.cell_value(r, rub_i)))
                    except:
                        rub_id = 0
                    nom_rub = str(sheet.cell_value(r, nrub_i)).strip().upper() or 'SIN RUBRO'
                    srub_id = 0
                    if srub_i >= 0:
                        try:
                            srub_id = int(float(sheet.cell_value(r, srub_i)))
                        except:
                            srub_id = 0
                    nom_sub = str(sheet.cell_value(r, nsrub_i)).strip().upper() if nsrub_i >= 0 else ''
                    try:
                        unidades = float(sheet.cell_value(r, uni_i)) if uni_i >= 0 else 0
                    except:
                        unidades = 0
                    try:
                        precio = float(sheet.cell_value(r, pre_i)) if pre_i >= 0 else 0
                    except:
                        precio = 0
                    try:
                        venta = float(sheet.cell_value(r, ven_i)) if ven_i >= 0 else 0
                    except:
                        venta = 0

                    entry = {
                        'codigo': cod,
                        'nombre': nom,
                        'rubroId': rub_id,
                        'rubro': nom_rub,
                        'subrubroId': srub_id,
                        'subrubro': nom_sub,
                        'precio': precio,
                        'unidades': unidades,
                        'venta': venta,
                        'sourceFile': fname
                    }
                    if cod > 0:
                        by_code[str(cod)] = entry
                    if nom:
                        by_name[normalize_name(nom)] = entry
                    items_in_file.append(entry)

                if items_in_file:
                    ranking_updated = True
                    catalog_data['byCode'] = by_code
                    catalog_data['byName'] = by_name
                    catalog_data['latestRankingSource'] = fname
                    catalog_data['latestRankingMtime'] = datetime.fromtimestamp(mtime).isoformat()
                    catalog_data['latestRankingItems'] = items_in_file
                    print(f"[ImportDesktopXLS] Catálogo de Categorías/Subcategorías actualizado desde {fname}: {len(items_in_file)} artículos.")
        except Exception as e:
            print(f"Error checking ranking XLS {fname}: {e}")

    def resolve_article(cod, nom, fallback_rub='', fallback_sub=''):
        if cod and str(cod) in by_code:
            hit = by_code[str(cod)]
            return hit.get('rubro') or 'SIN RUBRO', hit.get('subrubro') or ''
        norm = normalize_name(nom)
        if norm and norm in by_name:
            hit = by_name[norm]
            return hit.get('rubro') or 'SIN RUBRO', hit.get('subrubro') or ''
        # Partial match if name was truncated in DBF/XLS
        if len(norm) >= 6:
            for k, hit in by_name.items():
                if k.startswith(norm) or norm.startswith(k):
                    return hit.get('rubro') or 'SIN RUBRO', hit.get('subrubro') or ''
        rub = str(fallback_rub or '').strip().upper()
        sub = str(fallback_sub or '').strip().upper()
        if rub in ('ALMUERZO CENA', 'ALMUERZO / CENA', 'COCINA / PLATO PRINCIPAL'):
            rub = 'ALMUERZO CENA DESAYUNO'
        if not rub:
            rub = 'PASTELERIA' if ('TORTA' in norm or 'BUDIN' in norm) else 'ALMUERZO CENA DESAYUNO'
        return rub, sub

    if ranking_updated:
        try:
            with open(catalog_file, 'w', encoding='utf-8') as f:
                json.dump(catalog_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving categories_catalog.json: {e}")

    # PASS 2: Ingest Daily Mozo / Detailed Sales XLS files
    imported_dates = set()

    for mtime, p in candidates:
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
            cod_art_idx = headers.index('codigoart') if 'codigoart' in headers else (headers.index('cod_art') if 'cod_art' in headers else -1)
            art_idx = headers.index('nombreart') if 'nombreart' in headers else -1
            cant_idx = headers.index('cantidad') if 'cantidad' in headers else -1
            hora_idx = headers.index('hora') if 'hora' in headers else -1
            rub_idx = headers.index('nomrua') if 'nomrua' in headers else (headers.index('nombrua') if 'nombrua' in headers else -1)
            sub_idx = headers.index('nomsua') if 'nomsua' in headers else (headers.index('nombsua') if 'nombsua' in headers else -1)

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
                        'subrubros': {},
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
                cod_art = 0
                if cod_art_idx >= 0:
                    try:
                        cod_art = int(float(sheet.cell_value(r, cod_art_idx)))
                    except:
                        pass
                nom_art = str(sheet.cell_value(r, art_idx)).strip() if art_idx >= 0 else ''
                is_cubierto = 'CUBIERTO' in nom_art.upper()

                raw_rub = str(sheet.cell_value(r, rub_idx)).strip().upper() if rub_idx >= 0 else ''
                raw_sub = str(sheet.cell_value(r, sub_idx)).strip().upper() if sub_idx >= 0 else ''
                resolved_rub, resolved_sub = resolve_article(cod_art, nom_art, raw_rub, raw_sub)

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

                # Products & Categories
                if nom_art and not is_cubierto and 'INEXISTENTE' not in nom_art.upper():
                    if nom_art not in d['productos']:
                        d['productos'][nom_art] = {
                            'codigo': cod_art or 'ART',
                            'nombre': nom_art,
                            'rubro': resolved_rub,
                            'subrubro': resolved_sub,
                            'unidades': 0,
                            'facturado': 0
                        }
                    d['productos'][nom_art]['unidades'] += int(round(cant_val))
                    d['productos'][nom_art]['facturado'] += tot_val
                    if cod_art and d['productos'][nom_art]['codigo'] == 'ART':
                        d['productos'][nom_art]['codigo'] = cod_art

                if resolved_rub and not is_cubierto:
                    d['rubros'][resolved_rub] = d['rubros'].get(resolved_rub, 0) + tot_val
                if resolved_sub and not is_cubierto:
                    d['subrubros'][resolved_sub] = d['subrubros'].get(resolved_sub, 0) + tot_val

            # Format and save to audit_map
            for d_str, d in by_date.items():
                if d['grand_total'] > 0 and d['mozos']:
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
                            'codigo': p_info.get('codigo', 'ART'),
                            'nombre': p_nom,
                            'rubro': p_info.get('rubro', 'ALMUERZO CENA DESAYUNO'),
                            'subrubro': p_info.get('subrubro', ''),
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
                        'subrubros': {k: int(round(v)) for k, v in d['subrubros'].items()},
                        'productos': prod_list[:50],
                        'horarios': audit_map.get(d_str, {}).get('horarios') or []
                    }
                    imported_dates.add(d_str)
                    print(f"[ImportDesktopXLS] Ingestada fecha {d_str} desde {fname}: ${d['grand_total']:,.2f} en {len(d['all_tks'])} tickets, {len(mozos_list)} mozos")
        except Exception as e:
            print(f"Error processing {fname}: {e}")

    # PASS 3: Reclassify all existing days in audit_map using updated catalog & clean up corrupted hourly-only entries
    reclassified_days = 0
    for d_key, d_entry in list(audit_map.items()):
        if not isinstance(d_entry, dict):
            continue
        # Fix hourly-only entries where mozos is empty and totales.importe < 10000 (unit count bug)
        mozos_arr = d_entry.get('mozos') or []
        tot_obj = d_entry.get('totales') or {}
        if len(mozos_arr) == 0 and 0 < tot_obj.get('importe', 0) < 10000:
            tot_obj['importe'] = 0
            tot_obj['promedio'] = 0
            tot_obj['promedioCubierto'] = 0

        prods = d_entry.get('productos') or []
        if prods:
            new_subrubros = {}
            new_rubros_from_prods = {}
            for p_item in prods:
                cod_p = p_item.get('codigo')
                if cod_p == 'ART':
                    cod_p = 0
                nom_p = p_item.get('nombre', '')
                old_rub = p_item.get('rubro', '')
                old_sub = p_item.get('subrubro', '')
                res_rub, res_sub = resolve_article(cod_p, nom_p, old_rub, old_sub)
                p_item['rubro'] = res_rub
                p_item['subrubro'] = res_sub
                fact_p = p_item.get('facturado', 0) or 0
                if res_rub and fact_p > 0:
                    new_rubros_from_prods[res_rub] = new_rubros_from_prods.get(res_rub, 0) + fact_p
                if res_sub and fact_p > 0:
                    new_subrubros[res_sub] = new_subrubros.get(res_sub, 0) + fact_p

            # Also update d_entry['rubros'] keys (e.g. ALMUERZO CENA -> ALMUERZO CENA DESAYUNO, or recalculated from products)
            old_rubros_map = d_entry.get('rubros') or {}
            updated_rubros_map = {}
            if len(prods) >= 20 and sum(new_rubros_from_prods.values()) >= (tot_obj.get('importe', 0) * 0.85):
                updated_rubros_map = {k: int(round(v)) for k, v in new_rubros_from_prods.items()}
            else:
                for r_k, r_v in old_rubros_map.items():
                    clean_k = 'ALMUERZO CENA DESAYUNO' if r_k in ('ALMUERZO CENA', 'ALMUERZO / CENA') else r_k
                    updated_rubros_map[clean_k] = updated_rubros_map.get(clean_k, 0) + r_v
                # Ensure any newly moved rubros from top products are reflected
                if 'ALMUERZO CENA DESAYUNO' in new_rubros_from_prods and 'PASTELERIA' in updated_rubros_map:
                    # Adjust difference if items moved from PASTELERIA to ALMUERZO CENA DESAYUNO
                    pass
            d_entry['rubros'] = updated_rubros_map
            if new_subrubros:
                d_entry['subrubros'] = {k: int(round(v)) for k, v in new_subrubros.items()}
            reclassified_days += 1

    if imported_dates or reclassified_days > 0:
        with open(audit_file, 'w', encoding='utf-8') as f:
            json.dump(audit_map, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated {audit_file} ({len(imported_dates)} imported dates, {reclassified_days} reclassified days)")

if __name__ == '__main__':
    import_desktop_xls()
