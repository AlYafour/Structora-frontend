/**
 * Payment Helper Utilities
 *
 * Shared payment calculation helpers used across:
 * - FinancialDashboardTab
 * - ProjectFinancialEntitlementPage
 */

/**
 * Sum payment amounts filtered by payer type.
 *
 * @param {Array} payments - Array of payment objects
 * @param {string} payer - Payer type to filter by (e.g., 'owner', 'bank')
 * @returns {number} Total amount for the specified payer
 */
export function sumPaymentsByPayer(payments, payer) {
  return (payments || [])
    .filter(p =>
      p.payer === payer &&
      !(p.payment_method === 'promissory_note' && p.promissory_note_status !== 'honored')
    )
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
}
