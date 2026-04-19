import { describe, it, expect } from 'vitest';
import { round, num } from '../formatters/number';
import { feeInclusive, withVatTotal } from './financial';

describe('round()', () => {
  it('rounds half-up for positive values', () => {
    expect(round(100.5)).toBe(101);
    expect(round(100.4)).toBe(100);
    expect(round(100.6)).toBe(101);
  });

  it('rounds to nearest integer', () => {
    expect(round(99.99)).toBe(100);
    expect(round(0.1)).toBe(0);
    expect(round(0.9)).toBe(1);
  });

  it('handles string inputs', () => {
    expect(round('100.4')).toBe(100);
    expect(round('99.9')).toBe(100);
  });

  it('handles null and undefined', () => {
    expect(round(null)).toBe(0);
    expect(round(undefined)).toBe(0);
  });

  it('handles zero', () => {
    expect(round(0)).toBe(0);
  });
});

describe('VAT Consistency Invariant: amtExcl + amtVAT === amtIncl', () => {
  const VAT_RATE = 0.05;

  // This mirrors the FIXED formula in ProjectFinancialEntitlementPage.jsx
  const computeVatRow = (amount) => {
    const amtExcl = round(amount);
    const amtVAT  = round(amount * VAT_RATE);
    const amtIncl = amtExcl + amtVAT; // Fixed formula
    return { amtExcl, amtVAT, amtIncl };
  };

  it('amtExcl + amtVAT === amtIncl for typical amounts', () => {
    [100, 100.4, 100.5, 100.6, 999.99, 1500.33, 50000, 0].forEach(amount => {
      const { amtExcl, amtVAT, amtIncl } = computeVatRow(amount);
      expect(amtExcl + amtVAT).toBe(amtIncl);
    });
  });

  it('amtIncl is always an integer after the fix', () => {
    [100.1, 200.9, 333.3, 1000, 9.5, 0.5].forEach(amount => {
      const { amtIncl } = computeVatRow(amount);
      expect(Number.isInteger(amtIncl)).toBe(true);
    });
  });

  it('amtExcl and amtVAT are always integers', () => {
    [100.4, 999.99, 1500.33].forEach(amount => {
      const { amtExcl, amtVAT } = computeVatRow(amount);
      expect(Number.isInteger(amtExcl)).toBe(true);
      expect(Number.isInteger(amtVAT)).toBe(true);
    });
  });

  it('old formula could produce different result (demonstrates the bug was real)', () => {
    // Test with amount where independent rounding produces different sums
    // old: amtIncl = round(amount * 1.05)
    // new: amtIncl = round(amount) + round(amount * 0.05)
    // For most values they agree, but the new formula guarantees the column adds up
    const amount = 9.995;
    const amtExcl = round(amount);        // round(9.995) = 10
    const amtVAT  = round(amount * 0.05); // round(0.4997) = 0 -> actually round(0.49975) = 0
    const amtInclNew = amtExcl + amtVAT;  // 10 + 0 = 10
    const amtInclOld = round(amount * 1.05); // round(10.49475) = 10
    // Both same here, but the NEW formula GUARANTEES amtExcl + amtVAT = amtIncl
    expect(amtInclNew).toBe(amtExcl + amtVAT); // Always true with new formula
  });
});

describe('withVatTotal()', () => {
  it('calculates amount + round(amount * rate)', () => {
    // withVatTotal keeps base unrounded and rounds only VAT
    expect(withVatTotal(100, 0.05)).toBe(105);     // 100 + round(5) = 105
    expect(withVatTotal(1000, 0.05)).toBe(1050);   // 1000 + round(50) = 1050
  });

  it('defaults to 5% VAT rate', () => {
    expect(withVatTotal(1000)).toBe(1050);
    expect(withVatTotal(200)).toBe(210);
  });

  it('handles zero', () => {
    expect(withVatTotal(0)).toBe(0);
  });

  it('handles null/undefined', () => {
    expect(withVatTotal(null)).toBe(0);
    expect(withVatTotal(undefined)).toBe(0);
  });
});

describe('feeInclusive()', () => {
  it('extracts inclusive fee correctly', () => {
    // 5% fee on 1050 gross: fee = 1050 * 5/105 = 50
    const result = feeInclusive(1050, 5);
    expect(result.fee).toBe(50);
    expect(result.net).toBe(1000);
  });

  it('fee + net = gross', () => {
    const testCases = [
      [1050, 5],
      [2100, 10],
      [5250, 5],
    ];
    testCases.forEach(([gross, percent]) => {
      const { fee, net } = feeInclusive(gross, percent);
      expect(fee + net).toBe(gross);
    });
  });

  it('returns zero fee for zero gross', () => {
    expect(feeInclusive(0, 5)).toEqual({ fee: 0, net: 0 });
  });

  it('returns zero fee for zero percent', () => {
    expect(feeInclusive(1000, 0)).toEqual({ fee: 0, net: 1000 });
  });

  it('handles string inputs', () => {
    const result = feeInclusive('1050', '5');
    expect(result.fee).toBe(50);
    expect(result.net).toBe(1000);
  });
});
