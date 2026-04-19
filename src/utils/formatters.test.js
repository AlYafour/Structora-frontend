import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatDate,
  toArabicDigits,
  formatMoney,
  formatMoneyArabic,
} from './formatters';

describe('Formatters Utilities', () => {
  describe('formatNumber', () => {
    it('formats number with commas and 2 decimals by default', () => {
      expect(formatNumber(1000)).toBe('1,000.00');
      expect(formatNumber(1000000)).toBe('1,000,000.00');
    });

    it('formats decimal numbers with specified precision', () => {
      expect(formatNumber(1234.567, { decimals: 2 })).toBe('1,234.57');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    it('returns dash for null and undefined', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
    });

    it('returns dash for empty string', () => {
      expect(formatNumber('')).toBe('—');
    });
  });

  describe('formatMoney', () => {
    it('formats money with commas', () => {
      const result = formatMoney(1000);
      expect(result).toContain('1,000');
    });

    it('handles null/undefined gracefully', () => {
      const nullResult = formatMoney(null);
      const undefResult = formatMoney(undefined);
      expect(typeof nullResult).toBe('string');
      expect(typeof undefResult).toBe('string');
    });
  });

  describe('toArabicDigits', () => {
    it('converts English digits to Arabic digits', () => {
      expect(toArabicDigits('123')).toBe('١٢٣');
      expect(toArabicDigits('456')).toBe('٤٥٦');
      expect(toArabicDigits('789')).toBe('٧٨٩');
      expect(toArabicDigits('0')).toBe('٠');
    });

    it('converts numbers in mixed strings', () => {
      expect(toArabicDigits('Project 123')).toBe('Project ١٢٣');
    });

    it('handles empty strings', () => {
      expect(toArabicDigits('')).toBe('');
    });

    it('handles null and undefined', () => {
      expect(toArabicDigits(null)).toBe('');
      expect(toArabicDigits(undefined)).toBe('');
    });
  });

  describe('formatMoneyArabic', () => {
    it('formats money with Arabic digits', () => {
      const result = formatMoneyArabic(1000);
      expect(result).toBeTruthy();
      expect(result).not.toBe('—');
    });

    it('returns dash for null', () => {
      expect(formatMoneyArabic(null)).toBe('—');
    });
  });

  describe('formatDate', () => {
    it('formats date in dd/mm/yyyy format', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('15/01/2024');
    });

    it('handles different dates', () => {
      expect(formatDate('2024-12-31')).toBe('31/12/2024');
    });

    it('returns dash for invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('—');
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
    });
  });
});
