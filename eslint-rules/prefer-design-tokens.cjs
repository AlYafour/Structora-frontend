/**
 * ESLint Custom Rule: prefer-design-tokens
 *
 * Detects hardcoded color values and suggests using design tokens instead.
 * This is a warning-level rule to help identify areas for improvement.
 *
 * ⚠️  Warning: .component { color: #0d9488; }
 * ✅ Good:    .component { color: var(--color-primary-600); }
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer design tokens over hardcoded values in CSS/styles',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      hardcodedColor: 'Hardcoded color "{{value}}" detected. Consider using design tokens like var(--color-*). See design-tokens.css for available tokens.',
      hardcodedSize: 'Hardcoded size "{{value}}" detected. Consider using design tokens like var(--space-*) for spacing or var(--font-size-*) for typography.',
    },
    schema: [],
  },

  create(context) {
    // This rule primarily targets CSS files, but can also catch
    // template literals in styled-components if needed

    const hexColorPattern = /#[0-9a-fA-F]{3,8}\b/g;
    const rgbColorPattern = /rgba?\([^)]+\)/g;
    const hardcodedSizePattern = /\b\d+px\b(?!.*var\()/g;

    return {
      TemplateLiteral(node) {
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText(node);

        // Check for hardcoded colors
        const hexMatches = text.match(hexColorPattern);
        if (hexMatches) {
          hexMatches.forEach(match => {
            context.report({
              node,
              messageId: 'hardcodedColor',
              data: { value: match },
            });
          });
        }

        const rgbMatches = text.match(rgbColorPattern);
        if (rgbMatches) {
          rgbMatches.forEach(match => {
            context.report({
              node,
              messageId: 'hardcodedColor',
              data: { value: match },
            });
          });
        }
      },

      // Catch hardcoded values in JSX style objects
      Property(node) {
        if (node.value && node.value.type === 'Literal') {
          const value = node.value.value;
          if (typeof value === 'string') {
            // Check for hex colors
            if (hexColorPattern.test(value)) {
              context.report({
                node,
                messageId: 'hardcodedColor',
                data: { value },
              });
            }
            // Check for rgb/rgba
            if (rgbColorPattern.test(value)) {
              context.report({
                node,
                messageId: 'hardcodedColor',
                data: { value },
              });
            }
          }
        }
      },
    };
  },
};
