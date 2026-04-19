import os, re
ar = re.compile(r'[\u0600-\u06FF]')
skip_files = {'ProjectTypeSelector.jsx','constants.js','projectLabels.js'}
skip_paths = ['services','utils','.test.','node_modules','dist']
out = {}
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules','dist','.git']]
    for fn in files:
        if not (fn.endswith('.jsx') or fn.endswith('.js')):
            continue
        if fn in skip_files:
            continue
        fp = os.path.join(root, fn)
        fp_fwd = fp.replace(os.sep, '/')
        if any(s in fp_fwd for s in skip_paths):
            continue
        try:
            lines = open(fp, encoding='utf-8').readlines()
        except:
            continue
        hits = []
        for i, line in enumerate(lines, 1):
            s = line.strip()
            if not ar.search(s):
                continue
            if s.startswith('//') or s.startswith('*'):
                continue
            if 'isAr' in s or 'UI.' in s:
                continue
            if "t('" in s or 't("' in s:
                continue
            if 'import ' in s or 'export ' in s:
                continue
            hits.append((i, s[:110]))
        if hits:
            out[fp_fwd] = hits
for fp, hits in sorted(out.items()):
    print(f'\n=== {fp} ({len(hits)}) ===')
    for n, t in hits[:10]:
        print(f'  L{n}: {t}')
