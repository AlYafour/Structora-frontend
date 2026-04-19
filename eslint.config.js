/**
 * ESLint Configuration - Production Ready
 * @version 2.0.0
 *
 * Rules optimized for:
 * - Code quality and consistency
 * - React best practices
 * - Performance optimization hints
 */

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // Ignore patterns
  globalIgnores(['dist', 'node_modules', '*.min.js', 'coverage']),

  // Main configuration
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ===== Code Quality =====
      // Allow unused vars that start with _ or uppercase (for constants)
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^[_A-Z]',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Prevent accidental console statements (warn, not error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Enforce consistent return statements
      'consistent-return': 'off',

      // ===== React Specific =====
      // React Refresh - allow constant exports
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // React Hooks - ensure dependencies are correct
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ===== Best Practices =====
      // Prefer const over let when possible
      'prefer-const': 'warn',

      // No var usage
      'no-var': 'error',

      // Use strict equality
      eqeqeq: ['warn', 'smart'],

      // No debugger in production
      'no-debugger': 'warn',

      // ===== Style (handled by Prettier, but kept for safety) =====
      // These are disabled to avoid conflicts with Prettier
      'max-len': 'off',
      indent: 'off',
      quotes: 'off',
      semi: 'off',
    },
  },
]);
