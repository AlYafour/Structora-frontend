#!/usr/bin/env python3
import os, re

static = 0
dynamic = 0
dynamic_types = {"ternary": 0, "spread": 0, "computed_key": 0, "func_call": 0, "template": 0, "rtl": 0, "other": 0}

for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith(('.jsx', '.tsx')):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        for m in re.finditer(r'style=\{\{(.*?)\}\}', content, re.DOTALL):
            inner = m.group(1).strip().rstrip(',')
            has_ternary = '?' in inner and ':' in inner
            has_rtl = 'isRTL' in inner or 'isAR' in inner
            has_spread = '...' in inner
            has_computed = re.search(r'\[.*\]', inner) is not None
            has_template = '`' in inner and '${' in inner
            cleaned = inner.replace('var(', 'VAR_').replace('rgba(', 'RGBA_').replace('linear-gradient(', 'LG_')
            cleaned = cleaned.replace('drop-shadow(', 'DS_').replace('translateX(', 'TX_').replace('scale(', 'SC_')
            cleaned = cleaned.replace('minmax(', 'MM_').replace('repeat(', 'RP_')
            has_func = re.search(r'[a-zA-Z_]\w*\(', cleaned) is not None

            if has_spread:
                dynamic += 1
                dynamic_types["spread"] += 1
            elif has_rtl:
                dynamic += 1
                dynamic_types["rtl"] += 1
            elif has_computed:
                dynamic += 1
                dynamic_types["computed_key"] += 1
            elif has_template:
                dynamic += 1
                dynamic_types["template"] += 1
            elif has_func:
                dynamic += 1
                dynamic_types["func_call"] += 1
            elif has_ternary:
                dynamic += 1
                dynamic_types["ternary"] += 1
            else:
                static += 1

print(f'Static:  {static}')
print(f'Dynamic: {dynamic}')
for k, v in sorted(dynamic_types.items(), key=lambda x: -x[1]):
    if v > 0:
        print(f'  {k}: {v}')
print(f'Total:   {static + dynamic}')
