import PropTypes from "prop-types";

/**
 * Professional Card Component - Design System v4.0
 * Unified card component with consistent styling
 */
export default function Card({
  children,
  title,
  subtitle,
  actions,
  className = "",
  variant = "default", // default | elevated | outlined | interactive
  padding = "default", // none | sm | default | lg
  ...props
}) {
  const classes = [
    "ds-card",
    variant !== "default" && `ds-card--${variant}`,
    padding !== "default" && `ds-card--padding-${padding}`,
    className
  ].filter(Boolean).join(" ");

  const hasHeader = title || subtitle || actions;

  return (
    <div className={classes} {...props}>
      {hasHeader && (
        <div className="ds-card__header">
          <div className="ds-card__header-content">
            {title && <h3 className="ds-card__title">{title}</h3>}
            {subtitle && <p className="ds-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ds-card__actions">{actions}</div>}
        </div>
      )}
      {children && <div className="ds-card__body">{children}</div>}
    </div>
  );
}

Card.propTypes = {
  /** Content of the card */
  children: PropTypes.node,
  /** Card title */
  title: PropTypes.node,
  /** Card subtitle or description */
  subtitle: PropTypes.node,
  /** Action buttons or elements in header */
  actions: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Visual style variant */
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined', 'interactive']),
  /** Padding size */
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
};

// Subcomponents for flexible composition
Card.Header = function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`ds-card__header ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Header.propTypes = {
  /** Content of the header */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
};

Card.Title = function CardTitle({ children, className = "", ...props }) {
  return (
    <h3 className={`ds-card__title ${className}`} {...props}>
      {children}
    </h3>
  );
};

Card.Title.propTypes = {
  /** Title text */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
};

Card.Body = function CardBody({ children, className = "", ...props }) {
  return (
    <div className={`ds-card__body ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Body.propTypes = {
  /** Body content */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
};

Card.Footer = function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`ds-card__footer ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer.propTypes = {
  /** Footer content */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
};
