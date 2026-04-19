# Design System ESLint Rules

Custom ESLint rules to enforce Design System compliance.

## Available Rules

### 1. `design-system/no-inline-styles`

**Severity:** Error ❌

Prevents the use of inline `style={{}}` attributes in JSX.

**❌ Incorrect:**
```javascript
<div style={{ padding: '16px', color: '#0d9488' }}>
  Content
</div>
```

**✅ Correct:**
```javascript
<div className="ds-p-4 ds-text-primary">
  Content
</div>
```

---

### 2. `design-system/no-direct-mui-imports`

**Severity:** Error ❌

Prevents direct imports from `@mui/material` in feature code. MUI should only be imported inside Design System components (`/components/common/`, `/components/ui/`, `/theme/`).

**❌ Incorrect (in `/features/`):**
```javascript
import { Button, Card, Box } from '@mui/material';
```

**✅ Correct:**
```javascript
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
```

**✅ Also Correct (in `/components/common/`):**
```javascript
// This is allowed inside Design System components
import { Button as MuiButton } from '@mui/material';
```

---

### 3. `design-system/prefer-design-tokens`

**Severity:** Warning ⚠️

Detects hardcoded color values and sizes in code. Suggests using design tokens instead.

**⚠️  Warning:**
```javascript
const styles = {
  color: '#0d9488',
  padding: '23px',
};
```

**✅ Better:**
```css
.component {
  color: var(--color-primary-600);
  padding: var(--space-6);
}
```

---

## Installation & Usage

### 1. Install Dependencies

The rules are already created in the `eslint-rules/` folder. No additional packages needed.

### 2. Update ESLint Config

The rules are configured in `eslint.config.js` with the `design-system/*` namespace.

### 3. Run Linter

```bash
# Check for violations
npm run lint

# Auto-fix what's possible
npm run lint:fix
```

### 4. Pre-Commit Hook (Recommended)

Set up Husky to run linting before commits:

```bash
# Install husky
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

Create `.lintstagedrc.json`:
```json
{
  "src/**/*.{js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

---

## Disabling Rules (Emergency Only)

### Per-Line Disable

```javascript
// eslint-disable-next-line design-system/no-inline-styles
<div style={{ padding: '16px' }}>Emergency override</div>
```

### Per-File Disable

```javascript
/* eslint-disable design-system/no-inline-styles */
// Entire file ignores this rule
```

**⚠️  Important:** Disabling rules should be **rare** and **documented**. Every disable comment should have a TODO ticket.

**Example:**
```javascript
// TODO(#1234): Remove this once StatusBadge component is built
// eslint-disable-next-line design-system/no-inline-styles
<span style={{ background: '#f3e8ff' }}>Status</span>
```

---

## Gradual Rollout Strategy

Since we have 72 files with violations, we can't enforce all rules immediately.

### Phase 1: Prevent New Violations (Current)

**Config:**
```javascript
rules: {
  'design-system/no-inline-styles': 'warn',        // Warn on new violations
  'design-system/no-direct-mui-imports': 'error',   // Block new MUI imports
  'design-system/prefer-design-tokens': 'warn',     // Suggest improvements
}
```

### Phase 2: Error on New Files (Week 2)

**Config:**
```javascript
rules: {
  'design-system/no-inline-styles': [
    'error',
    {
      // Only allow in legacy files (to be refactored)
      allowedFiles: [
        'src/features/projects/pages/ProjectsPage.jsx',
        'src/features/invoices/pages/InvoicesPage.jsx',
        // ... other legacy files
      ]
    }
  ],
}
```

### Phase 3: Zero Tolerance (Week 6)

**Config:**
```javascript
rules: {
  'design-system/no-inline-styles': 'error',        // No exceptions
  'design-system/no-direct-mui-imports': 'error',
  'design-system/prefer-design-tokens': 'error',
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
```

### GitLab CI

```yaml
# .gitlab-ci.yml
lint:
  stage: test
  script:
    - npm ci
    - npm run lint
```

---

## Reporting False Positives

If a rule incorrectly flags valid code:

1. **Document the case** in a GitHub issue
2. **Add a bypass comment** with explanation
3. **File a bug** for the ESLint rule

**Example:**
```javascript
// False positive: This is required for print media
// See issue #5678
/* eslint-disable design-system/no-inline-styles */
<style>
  @media print {
    .print-layout { width: 210mm; }
  }
</style>
/* eslint-enable design-system/no-inline-styles */
```

---

## FAQ

### Q: Why are these custom rules needed?

**A:** Standard ESLint rules can't detect Design System violations. We need custom rules that understand our project structure and component library.

### Q: Can I disable these rules for my feature?

**A:** Only with approval and a documented plan to fix. See [DS_ENFORCEMENT_GUIDELINES.md](../../DS_ENFORCEMENT_GUIDELINES.md#exceptions-process).

### Q: What if I need to use inline styles temporarily?

**A:** Add a TODO comment with a ticket number and get approval from the Design System team.

### Q: How do I add a new rule?

**A:**
1. Create `new-rule-name.cjs` in this folder
2. Add to `eslint.config.js` plugins
3. Write tests for the rule
4. Document in this README

### Q: Do these rules slow down development?

**A:** Initially yes, but they prevent technical debt. Once developers learn the patterns, it becomes second nature.

---

## Resources

- [Design System Enforcement Plan](../../DESIGN_SYSTEM_ENFORCEMENT.md)
- [Enforcement Guidelines](../../DS_ENFORCEMENT_GUIDELINES.md)
- [Missing Components](../../MISSING_DS_COMPONENTS.md)
- [ESLint Custom Rules Docs](https://eslint.org/docs/latest/extend/custom-rules)

---

**Version:** 1.0
**Last Updated:** February 15, 2026
