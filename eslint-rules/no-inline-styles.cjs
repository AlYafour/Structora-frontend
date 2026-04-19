/**
 * ESLint Custom Rule: no-inline-styles
 *
 * Prevents the use of inline styles in JSX elements.
 * Enforces Design System compliance by requiring className usage.
 *
 * ❌ Bad:  <div style={{ padding: '16px' }}>
 * ✅ Good: <div className="ds-p-4">
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow inline styles in JSX elements',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      noInlineStyles: 'Inline styles are forbidden. Use Design System classes or design tokens instead. See DS_ENFORCEMENT_GUIDELINES.md for approved patterns.',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    return {
      JSXAttribute(node) {
        // Check if the attribute is 'style'
        if (node.name && node.name.name === 'style') {
          // Check if it's a JSX expression (style={{...}})
          if (node.value && node.value.type === 'JSXExpressionContainer') {
            context.report({
              node,
              messageId: 'noInlineStyles',
            });
          }
        }
      },
    };
  },
};
