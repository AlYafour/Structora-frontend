import { forwardRef } from "react";
import PropTypes from "prop-types";

/**
 * 🎨 Professional Button Component
 * Enterprise-grade button with consistent styling across the application
 * 
 * @param {string} variant - primary | accent | secondary | ghost | danger | success | outline | link
 * @param {string} size - sm | md | lg | icon
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Take full width of container
 * @param {ReactNode} startIcon - Icon before text
 * @param {ReactNode} endIcon - Icon after text
 * @param {string} as - Render as different element (button, a, Link)
 */
const Button = forwardRef(({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  fullWidth = false,
  block = false, // alias for fullWidth
  startIcon,
  endIcon,
  icon, // legacy support
  iconPosition = "left", // legacy support
  onClick,
  type = "button",
  as: Component = "button",
  ...props
}, ref) => {
  // Build class names
  const classes = [
    "ds-btn",
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    (fullWidth || block) && "ds-btn--full",
    loading && "ds-btn--loading",
    className
  ].filter(Boolean).join(" ");

  // Handle legacy icon prop
  const renderStartIcon = startIcon || (icon && iconPosition === "left" ? icon : null);
  const renderEndIcon = endIcon || (icon && iconPosition === "right" ? icon : null);

  const buttonProps = Component === "button" ? { type, disabled: disabled || loading } : {};

  return (
    <Component
      ref={ref}
      className={classes}
      onClick={!disabled && !loading ? onClick : undefined}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...buttonProps}
      {...props}
    >
      {loading && (
        <span className="ds-btn__spinner" aria-hidden="true">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
            className="animate-spin"
          >
            <circle 
              cx="8" 
              cy="8" 
              r="6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              opacity="0.25"
            />
            <path 
              d="M14 8a6 6 0 0 0-6-6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      {!loading && renderStartIcon && (
        <span className="ds-btn__icon ds-btn__icon--start">{renderStartIcon}</span>
      )}
      {children && <span className="ds-btn__text">{children}</span>}
      {!loading && renderEndIcon && (
        <span className="ds-btn__icon ds-btn__icon--end">{renderEndIcon}</span>
      )}
    </Component>
  );
});

Button.displayName = "Button";

Button.propTypes = {
  /** Content of the button */
  children: PropTypes.node,
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'accent', 'secondary', 'ghost', 'danger', 'success', 'outline', 'link']),
  /** Size of the button */
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'icon']),
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Whether button is disabled */
  disabled: PropTypes.bool,
  /** Whether button is in loading state */
  loading: PropTypes.bool,
  /** Whether button should take full width */
  fullWidth: PropTypes.bool,
  /** Alias for fullWidth (legacy) */
  block: PropTypes.bool,
  /** Icon to show before text */
  startIcon: PropTypes.node,
  /** Icon to show after text */
  endIcon: PropTypes.node,
  /** Icon to show (legacy) */
  icon: PropTypes.node,
  /** Position of icon (legacy) */
  iconPosition: PropTypes.oneOf(['left', 'right']),
  /** Click handler */
  onClick: PropTypes.func,
  /** Button type attribute */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  /** Element or component to render as */
  as: PropTypes.elementType,
};

export default Button;
