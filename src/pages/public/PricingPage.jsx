import { useTranslation } from 'react-i18next';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import './PricingPage.css';
import useTenantNavigate from '../../hooks/useTenantNavigate';

export default function PricingPage() {
  const navigate = useTenantNavigate();
  const { t } = useTranslation();

  const plans = [
    {
      name: t('pricing_user_based_plan'),
      nameEn: 'User-Based',
      price: '150',
      currency: 'AED',
      period: t('pricing_per_user_per_year'),
      description: t('pricing_perfect_for_small'),
      features: [
        t('pricing_unlimited_projects'),
        t('pricing_complete_project_management'),
        t('pricing_approval_system'),
        t('pricing_basic_reports'),
        t('pricing_technical_support'),
      ],
      popular: false,
    },
    {
      name: t('pricing_basic_plan'),
      nameEn: 'Basic',
      price: '2,000',
      currency: 'AED',
      period: t('pricing_per_year'),
      description: t('pricing_perfect_for_medium'),
      features: [
        t('pricing_5_users_included'),
        t('pricing_15_projects'),
        t('pricing_additional_user_150'),
        t('pricing_complete_project_management'),
        t('pricing_advanced_approval_system'),
        t('pricing_comprehensive_reports'),
        t('pricing_premium_support'),
      ],
      popular: true,
    },
    {
      name: t('pricing_medium_business_plan'),
      nameEn: 'Medium Business',
      price: t('pricing_coming_soon'),
      currency: '',
      period: '',
      description: t('pricing_will_be_announced'),
      features: [
        t('pricing_additional_features'),
        t('pricing_more_users'),
        t('pricing_unlimited_projects'),
      ],
      popular: false,
      comingSoon: true,
    },
    {
      name: t('pricing_enterprise_plan'),
      nameEn: 'Enterprise',
      price: t('pricing_coming_soon'),
      currency: '',
      period: '',
      description: t('pricing_will_be_announced'),
      features: [
        t('pricing_advanced_features'),
        t('pricing_unlimited_users'),
        t('pricing_custom_support'),
      ],
      popular: false,
      comingSoon: true,
    },
  ];

  return (
    <div className="pricing-page">
      {/* Header */}
      <header className="ds-flex ds-justify-between ds-items-center pricing-header">
        <div className="ds-text-xl ds-font-bold ds-section-icon">
          {t('pricing_project_management_system')}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/landing')}>
            {t('pricing_home')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            {t('pricing_sign_in')}
          </Button>
          <Button variant="primary" onClick={() => navigate('/register-company')}>
            {t('pricing_sign_up')}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="ds-text-center pricing-hero">
        <h1 className="ds-font-bold pricing-hero__title">
          {t('pricing_plans_title')}
        </h1>
        <p className="ds-text-xl pricing-hero__subtitle">
          {t('pricing_choose_plan_description')}
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pricing-cards">
        <div className="pricing-grid">
          {plans.map((plan) => (
            <Card
              key={plan.nameEn}
              className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''}`}
            >
              {plan.popular && (
                <div className="ds-text-sm ds-font-semibold pricing-badge">
                  {t('pricing_most_popular')}
                </div>
              )}
              {plan.comingSoon && (
                <div className="ds-text-sm ds-font-semibold pricing-badge--coming-soon">
                  {t('pricing_coming_soon')}
                </div>
              )}
              <h3 className="ds-text-2xl ds-font-bold pricing-plan__name">
                {plan.name}
              </h3>
              <p className="ds-text-sm pricing-plan__desc">
                {plan.description}
              </p>
              <div className="mb-6">
                <div className="ds-flex pricing-plan__price-row">
                  <span className="ds-font-bold pricing-plan__price">
                    {plan.price}
                  </span>
                  {plan.currency && (
                    <span className="ds-text-lg ds-text-secondary">
                      {plan.currency}
                    </span>
                  )}
                </div>
                {plan.period && (
                  <p className="ds-text-sm pricing-plan__period">
                    {plan.period}
                  </p>
                )}
              </div>
              <ul className="pricing-features">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="ds-flex ds-items-center pricing-features__item"
                  >
                    <span className="ds-text-lg ds-section-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => navigate('/register-company')}
                disabled={plan.comingSoon}
              >
                {plan.comingSoon
                  ? t('pricing_coming_soon')
                  : t('pricing_choose_plan')}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pricing-faq">
        <div className="ds-max-w-800">
          <h2 className="ds-font-semibold ds-text-center pricing-faq__title">
            {t('pricing_faq_title')}
          </h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: t('pricing_faq_change_plan_q'),
                a: t('pricing_faq_change_plan_a'),
              },
              {
                q: t('pricing_faq_trial_period_q'),
                a: t('pricing_faq_trial_period_a'),
              },
              {
                q: t('pricing_faq_add_users_q'),
                a: t('pricing_faq_add_users_a'),
              },
            ].map((faq) => (
              <Card key={faq.q}>
                <h4 className="ds-text-lg ds-font-semibold ds-mb-2">
                  {faq.q}
                </h4>
                <p className="pricing-faq__answer">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="ds-text-center pricing-cta">
        <div className="ds-max-w-800">
          <h2 className="ds-font-bold pricing-cta__title">
            {t('pricing_get_started')}
          </h2>
          <p className="ds-text-xl pricing-cta__desc">
            {t('pricing_register_description')}
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/register-company')}
            className="pricing-cta__btn"
          >
            {t('pricing_create_free_account')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="ds-text-center pricing-footer">
        <p>
          {t('pricing_footer_copyright')}
        </p>
      </footer>
    </div>
  );
}
