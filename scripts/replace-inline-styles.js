#!/usr/bin/env node

/**
 * Automated Inline Styles Replacement Script
 * Replaces common inline style patterns with utility classes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Replacement patterns (order matters - most specific first)
const patterns = [
  // Pattern 1: Padding + textAlign
  {
    name: 'Padding 40px + textAlign center',
    regex: /style=\{\{\s*padding:\s*['"]40px['"]\s*,\s*textAlign:\s*['"]center['"]\s*\}\}/g,
    replace: 'className="ds-p-10 ds-text-center"'
  },
  {
    name: 'Padding 20px + textAlign center',
    regex: /style=\{\{\s*padding:\s*['"]20px['"]\s*,\s*textAlign:\s*['"]center['"]\s*\}\}/g,
    replace: 'className="ds-p-5 ds-text-center"'
  },

  // Pattern 2: Simple margins (for icons)
  {
    name: 'MarginRight 8px',
    regex: /style=\{\{\s*marginRight:\s*['"]8px['"]\s*\}\}/g,
    replace: 'className="ds-mr-2"'
  },
  {
    name: 'MarginLeft 8px',
    regex: /style=\{\{\s*marginLeft:\s*['"]8px['"]\s*\}\}/g,
    replace: 'className="ds-ml-2"'
  },
  {
    name: 'MarginBottom 20px',
    regex: /style=\{\{\s*marginBottom:\s*['"]20px['"]\s*\}\}/g,
    replace: 'className="ds-mb-5"'
  },
  {
    name: 'MarginBottom 4px',
    regex: /style=\{\{\s*marginBottom:\s*['"]4px['"]\s*\}\}/g,
    replace: 'className="ds-mb-1"'
  },
  {
    name: 'MarginBottom 8px',
    regex: /style=\{\{\s*marginBottom:\s*['"]8px['"]\s*\}\}/g,
    replace: 'className="ds-mb-2"'
  },
  {
    name: 'MarginBottom 12px',
    regex: /style=\{\{\s*marginBottom:\s*['"]12px['"]\s*\}\}/g,
    replace: 'className="ds-mb-3"'
  },

  // Pattern 3: Flex with gap
  {
    name: 'Flex + gap 12px',
    regex: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*gap:\s*['"]12px['"]\s*\}\}/g,
    replace: 'className="ds-flex ds-gap-3"'
  },
  {
    name: 'Flex + gap 16px',
    regex: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*gap:\s*['"]16px['"]\s*\}\}/g,
    replace: 'className="ds-flex ds-gap-4"'
  },

  // Pattern 4: Flex with alignItems
  {
    name: 'Flex + alignItems center',
    regex: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*alignItems:\s*['"]center['"]\s*\}\}/g,
    replace: 'className="ds-flex ds-items-center"'
  },
  {
    name: 'Flex + alignItems center + gap 12px',
    regex: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*alignItems:\s*['"]center['"]\s*,\s*gap:\s*['"]12px['"]\s*\}\}/g,
    replace: 'className="ds-flex ds-items-center ds-gap-3"'
  },

  // Pattern 5: Simple padding
  {
    name: 'Padding 40px',
    regex: /style=\{\{\s*padding:\s*['"]40px['"]\s*\}\}/g,
    replace: 'className="ds-p-10"'
  },
  {
    name: 'Padding 20px',
    regex: /style=\{\{\s*padding:\s*['"]20px['"]\s*\}\}/g,
    replace: 'className="ds-p-5"'
  },
  {
    name: 'Padding 16px',
    regex: /style=\{\{\s*padding:\s*['"]16px['"]\s*\}\}/g,
    replace: 'className="ds-p-4"'
  },

  // Pattern 6: Margin 0
  {
    name: 'Margin 0',
    regex: /style=\{\{\s*margin:\s*0\s*\}\}/g,
    replace: 'className="ds-m-0"'
  },

  // Pattern 7: Font sizes
  {
    name: 'FontSize 0.875rem',
    regex: /style=\{\{\s*fontSize:\s*['"]0\.875rem['"]\s*\}\}/g,
    replace: 'className="ds-text-sm"'
  },
  {
    name: 'FontSize 1.25rem',
    regex: /style=\{\{\s*fontSize:\s*['"]1\.25rem['"]\s*\}\}/g,
    replace: 'className="ds-text-xl"'
  },
  {
    name: 'FontSize 1.5rem',
    regex: /style=\{\{\s*fontSize:\s*['"]1\.5rem['"]\s*\}\}/g,
    replace: 'className="ds-text-2xl"'
  },
  {
    name: 'FontSize 2rem',
    regex: /style=\{\{\s*fontSize:\s*['"]2rem['"]\s*\}\}/g,
    replace: 'className="ds-text-3xl"'
  },

  // Pattern 8: Font weight
  {
    name: 'FontWeight 600',
    regex: /style=\{\{\s*fontWeight:\s*600\s*\}\}/g,
    replace: 'className="ds-font-semibold"'
  },
  {
    name: 'FontWeight 700',
    regex: /style=\{\{\s*fontWeight:\s*700\s*\}\}/g,
    replace: 'className="ds-font-bold"'
  },
  {
    name: 'FontWeight 500',
    regex: /style=\{\{\s*fontWeight:\s*500\s*\}\}/g,
    replace: 'className="ds-font-medium"'
  }
];

// Files to exclude
const excludeFiles = [
  'src/features/variations/components/VariationPDFDocument.jsx',
  'src/components/invoices/InvoicePrintTemplate.jsx',
  'src/components/payments/PaymentPrintTemplate.jsx'
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;

  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches) {
      content = content.replace(pattern.regex, pattern.replace);
      replacements += matches.length;
      console.log(`  ✓ ${pattern.name}: ${matches.length} replacements`);
    }
  });

  if (replacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return replacements;
}

function main() {
  console.log('🚀 Starting inline styles replacement...\n');

  const files = glob.sync('src/**/*.{jsx,js}', {
    ignore: excludeFiles.map(f => f.replace(/\\/g, '/'))
  });

  console.log(`📁 Found ${files.length} files to process\n`);

  let totalReplacements = 0;
  let filesModified = 0;

  files.forEach(file => {
    const replacements = replaceInFile(file);
    if (replacements > 0) {
      console.log(`\n📝 ${file}: ${replacements} replacements`);
      filesModified++;
      totalReplacements += replacements;
    }
  });

  console.log(`\n✅ Complete!`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);
}

main();
