/**
 * ESLint Custom Rule: no-direct-mui-imports
 *
 * Prevents direct imports from @mui/material in feature code.
 * MUI components should only be imported in Design System components.
 *
 * ❌ Bad:  import { Button, Card } from '@mui/material';  (in /features/)
 * ✅ Good: import Button from '../../../components/common/Button';
 * ✅ Good: import { Button } from '@mui/material';  (in /components/common/)
 */

const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct @mui/material imports in feature code',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      noDirectMuiImports: 'Direct MUI imports are forbidden in {{location}}. Use Design System components from /components/common/ instead. See DS_ENFORCEMENT_GUIDELINES.md.',
    },
    schema: [],
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;
        const filename = context.getFilename();
        const normalizedPath = filename.replace(/\\/g, '/');

        // Check if importing from @mui/material
        if (importSource === '@mui/material' || importSource.startsWith('@mui/material/')) {
          // Allow in these directories:
          const allowedPaths = [
            '/components/common/',
            '/components/ui/',
            '/theme/',
          ];

          const isAllowed = allowedPaths.some(allowedPath =>
            normalizedPath.includes(allowedPath)
          );

          if (!isAllowed) {
            // Determine location type for better error message
            let location = 'feature code';
            if (normalizedPath.includes('/features/')) {
              location = 'feature modules (/features/)';
            } else if (normalizedPath.includes('/pages/')) {
              location = 'page components';
            } else if (normalizedPath.includes('/components/') && !normalizedPath.includes('/components/common/') && !normalizedPath.includes('/components/ui/')) {
              location = 'component code';
            }

            context.report({
              node,
              messageId: 'noDirectMuiImports',
              data: {
                location,
              },
            });
          }
        }
      },
    };
  },
};
