import { formatDate, capitalize, sleep } from '../helpers';

describe('helpers', () => {
  describe('formatDate', () => {
    it('formats date correctly in Vietnamese', () => {
      const date = new Date('2026-08-01');
      const formatted = formatDate(date);
      expect(formatted).toContain('2026');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('sleep', () => {
    it('resolves after specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });
});
