import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentClaimPrintTemplate from './PaymentClaimPrintTemplate';

// Mock i18next — returns the key itself so we can assert on translation keys
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      t: (key) => key,
      language: 'ar',
    },
  }),
}));

// Mock QRCodeSVG to avoid canvas/SVG rendering issues in test environment
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" aria-label="QR Code" />,
}));

const mockClaim = {
  id: 1,
  claim_number: 'PC-2024-001',
  claim_date: '2024-01-15',
  description: 'Monthly progress claim for January',
  materials_on_site_value: 1000,
  variations_claims_amount: 2000,
};

const mockProject = {
  name: 'Villa Project Alpha',
  license_data: { license_project_no: 'LIC-001' },
  siteplan_data: {
    owners: [{ owner_name_ar: 'أحمد محمد', is_authorized: true }],
  },
  contract_data: { contractor_name: 'ABC Construction LLC' },
};

const mockCompany = {
  name: 'شركة البناء',
  name_en: 'Building Co.',
  address: 'Dubai, UAE',
  phone: '+971 4 123 4567',
  email: 'info@building.ae',
  vat_number: 'TRN-12345',
  logo: null,
};

const mockTotals = {
  total_amount: 50000,
  advance_recovery_amount: 5000,
  previous_received_payments: 20000,
  other_deductions: 500,
  net_amount_due: 24500,
};

describe('PaymentClaimPrintTemplate', () => {
  it('renders without crashing', () => {
    expect(() => render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    )).not.toThrow();
  });

  it('displays claim number', () => {
    render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('PC-2024-001')).toBeInTheDocument();
  });

  it('displays project name', () => {
    render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Villa Project Alpha')).toBeInTheDocument();
  });

  it('displays company name', () => {
    render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('شركة البناء')).toBeInTheDocument();
  });

  it('renders QR code', () => {
    render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });

  it('does NOT render print controls when hideControls is true', () => {
    const { container } = render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
        hideControls={true}
      />
    );
    expect(container.querySelector('.pc-print-controls')).not.toBeInTheDocument();
  });

  it('DOES render print controls when hideControls is false', () => {
    const { container } = render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
        hideControls={false}
      />
    );
    expect(container.querySelector('.pc-print-controls')).toBeInTheDocument();
  });

  it('displays claim description/notes when provided', () => {
    render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Monthly progress claim for January/)).toBeInTheDocument();
  });

  it('does not render notes section when description is empty', () => {
    const claimNoDesc = { ...mockClaim, description: '' };
    const { container } = render(
      <PaymentClaimPrintTemplate
        claim={claimNoDesc}
        project={mockProject}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    );
    expect(container.querySelector('.pc-notes')).not.toBeInTheDocument();
  });

  it('handles missing optional fields gracefully (no crash)', () => {
    expect(() => render(
      <PaymentClaimPrintTemplate
        claim={{ id: 1, claim_date: null, claim_number: null }}
        project={{ name: 'Test', siteplan_data: {}, license_data: {}, contract_data: {} }}
        company={{ name: 'Co' }}
        totals={{}}
        onClose={() => {}}
      />
    )).not.toThrow();
  });

  it('handles null project gracefully (no crash)', () => {
    expect(() => render(
      <PaymentClaimPrintTemplate
        claim={mockClaim}
        project={null}
        company={mockCompany}
        totals={mockTotals}
        onClose={() => {}}
      />
    )).not.toThrow();
  });
});
