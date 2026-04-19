#!/usr/bin/env python3
import re
import sys
from pathlib import Path

class StyleCleaner:
    def __init__(self):
        self.patterns = [
            (r'style=\{\{\s*display:\s*["\x27]flex["\x27],\s*alignItems:\s*["\x27]center["\x27],\s*gap:\s*["\x27](\d+(?:\.\d+)?(?:rem|px|em))["\x27]\s*\}\}', r'className="flex items-center gap-\1"'),
            (r'style=\{\{\s*display:\s*["\x27]flex["\x27],\s*justifyContent:\s*["\x27]center["\x27],\s*gap:\s*["\x27](\d+(?:\.\d+)?(?:rem|px|em))["\x27]\s*\}\}', r'className="flex justify-center gap-\1"'),
            (r'style=\{\{\s*display:\s*["\x27]flex["\x27],\s*alignItems:\s*["\x27]center["\x27],\s*justifyContent:\s*["\x27]space-between["\x27]\s*\}\}', r'className="flex items-center justify-between"'),
            (r'style=\{\{\s*display:\s*["\x27]flex["\x27],\s*flexDirection:\s*["\x27]column["\x27],\s*gap:\s*["\x27](\d+(?:\.\d+)?(?:rem|px|em))["\x27]\s*\}\}', r'className="flex flex-col gap-\1"'),
            (r'style=\{\{\s*display:\s*["\x27]flex["\x27]\s*\}\}', r'className="flex"'),
            (r'style=\{\{\s*flexDirection:\s*["\x27]column["\x27]\s*\}\}', r'className="flex-col"'),
            (r'style=\{\{\s*alignItems:\s*["\x27]center["\x27]\s*\}\}', r'className="items-center"'),
            (r'style=\{\{\s*justifyContent:\s*["\x27]center["\x27]\s*\}\}', r'className="justify-center"'),
            (r'style=\{\{\s*justifyContent:\s*["\x27]space-between["\x27]\s*\}\}', r'className="justify-between"'),
            (r'style=\{\{\s*textAlign:\s*["\x27]center["\x27]\s*\}\}', r'className="text-center"'),
            (r'style=\{\{\s*fontWeight:\s*["\x27]?bold["\x27]?\s*\}\}', r'className="font-bold"'),
            (r'style=\{\{\s*gap:\s*["\x27](\d+(?:\.\d+)?(?:rem|px|em))["\x27]\s*\}\}', r'className="gap-\1"'),
            (r'style=\{\{\s*marginTop:\s*["\x27](\d+(?:\.\d+)?(?:rem|px|em))["\x27]\s*\}\}', r'className="mt-\1"'),
            (r'style=\{\{\s*width:\s*["\x27]100%["\x27]\s*\}\}', r'className="w-full"'),
        ]

    def clean_file(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            count = 0
            for pattern, replacement in self.patterns:
                new = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
                if new != content:
                    count += 1
                content = new
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, count
            return False, 0
        except Exception as e:
            print(f'Error: {filepath}: {e}')
            return False, 0

cleaner = StyleCleaner()
files = [
    'src/pages/CompanySettingsPage.jsx',
    'src/pages/AdminDashboardPage.jsx', 
    'src/components/ProgressHistoryTable.jsx',
    'src/pages/CompanyUsersPage.jsx'
]

total_modified = 0
for f in files:
    path = Path(f)
    if path.exists():
        modified, count = cleaner.clean_file(path)
        if modified:
            print(f'Modified {f}: {count} pattern types replaced')
            total_modified += 1
        else:
            print(f'No changes: {f}')
    else:
        print(f'Not found: {f}')

print(f'\nTotal files modified: {total_modified}')
