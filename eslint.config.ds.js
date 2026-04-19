/**
 * Design System ESLint Rules Configuration
 * @version 1.0.0
 *
 * Custom rules to enforce Design System compliance.
 * See eslint-rules/README.md for details.
 */

import noInlineStyles from './eslint-rules/no-inline-styles.cjs';
import noDirectMuiImports from './eslint-rules/no-direct-mui-imports.cjs';
import preferDesignTokens from './eslint-rules/prefer-design-tokens.cjs';

export const designSystemRules = {
  name: 'design-system',
  plugins: {
    'design-system': {
      rules: {
        'no-inline-styles': noInlineStyles,
        'no-direct-mui-imports': noDirectMuiImports,
        'prefer-design-tokens': preferDesignTokens,
      },
    },
  },
  rules: {
    /**
     * Phase 1: Warning Mode (Current - Week 1-2)
     * Warn on violations but don't block builds.
     * Goal: Raise awareness and prevent new violations.
     */
    'design-system/no-inline-styles': 'warn',
    'design-system/no-direct-mui-imports': 'error', // Block new MUI imports immediately
    'design-system/prefer-design-tokens': 'warn',

    /**
     * Phase 2: Error Mode (Week 3+)
     * Uncomment when legacy files are refactored:
     *
     * 'design-system/no-inline-styles': 'error',
     * 'design-system/no-direct-mui-imports': 'error',
     * 'design-system/prefer-design-tokens': 'error',
     */
  },
};

/**
 * Usage:
 *
 * In your eslint.config.js:
 *
 * import { designSystemRules } from './eslint.config.ds.js';
 *
 * export default defineConfig([
 *   // ... other configs
 *   designSystemRules,
 * ]);
 */
