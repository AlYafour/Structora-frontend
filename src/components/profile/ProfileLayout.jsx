import PropTypes from 'prop-types';
import Button from '../common/Button';
import './ProfileLayout.css';

export function ProfilePageHeader({ title, subtitle, backIcon, onBack }) {
  return (
    <div className="profile-layout__header">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="profile-layout__back"
          onClick={onBack}
          aria-label="Back"
        >
          {backIcon}
        </Button>
      )}
      <div>
        <h1 className="profile-layout__title">{title}</h1>
        {subtitle && <p className="profile-layout__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

ProfilePageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  backIcon: PropTypes.node,
  onBack: PropTypes.func,
};

export function ProfileLayout({ children, sidebar, header, alert, dir }) {
  return (
    <main className="profile-layout" dir={dir}>
      {alert}
      {header}
      <div className="profile-layout__grid">
        <aside className="profile-layout__sidebar">{sidebar}</aside>
        <div className="profile-layout__content">{children}</div>
      </div>
    </main>
  );
}

ProfileLayout.propTypes = {
  children: PropTypes.node.isRequired,
  sidebar: PropTypes.node.isRequired,
  header: PropTypes.node,
  alert: PropTypes.node,
  dir: PropTypes.oneOf(['ltr', 'rtl']),
};

export function ProfileIdentityCard({
  avatar,
  name,
  role,
  email,
  actions,
  processingText,
}) {
  return (
    <section className="profile-identity-card">
      <div className="profile-identity-card__avatar">{avatar}</div>
      <div className="profile-identity-card__body">
        <h2 className="profile-identity-card__name">{name}</h2>
        {role && <p className="profile-identity-card__role">{role}</p>}
        {email && <p className="profile-identity-card__email">{email}</p>}
      </div>
      {actions && <div className="profile-identity-card__actions">{actions}</div>}
      {processingText && <p className="profile-identity-card__processing">{processingText}</p>}
    </section>
  );
}

ProfileIdentityCard.propTypes = {
  avatar: PropTypes.node.isRequired,
  name: PropTypes.node.isRequired,
  role: PropTypes.node,
  email: PropTypes.node,
  actions: PropTypes.node,
  processingText: PropTypes.node,
};

export function ProfilePanel({ icon, title, subtitle, children, actions, className = '' }) {
  return (
    <section className={`profile-panel ${className}`.trim()}>
      <header className="profile-panel__header">
        <div className="profile-panel__heading">
          {icon && <span className="profile-panel__icon">{icon}</span>}
          <div>
            <h3 className="profile-panel__title">{title}</h3>
            {subtitle && <p className="profile-panel__subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="profile-panel__header-actions">{actions}</div>}
      </header>
      {children && <div className="profile-panel__body">{children}</div>}
    </section>
  );
}

ProfilePanel.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
};
