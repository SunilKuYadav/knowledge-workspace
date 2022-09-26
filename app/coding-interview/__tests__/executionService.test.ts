import { describe, it, expect } from 'vitest';
import { truncateOutput } from '../services/executionService';

describe('executionService', () => {
  describe('truncateOutput', () => {
    it('returns full output when under 10,000 chars', () => {
      const output = 'hello world';
      expect(truncateOutput(output)).toBe(output);
    });

    it('returns full output when exactly 10,000 chars', () => {
      const output = 'a'.repeat(10000);
      expect(truncateOutput(output)).toBe(output);
    });

    it('truncates output exceeding 10,000 chars with indicator', () => {
      const output = 'a'.repeat(10001);
      const result = truncateOutput(output);
      expect(result.startsWith('a'.repeat(10000))).toBe(true);
      expect(result).toContain('[output truncated at 10,000 characters]');
    });

    it('truncates long output and preserves first 10,000 chars', () => {
      const output = 'x'.repeat(50000);
      const result = truncateOutput(output);
      const prefix = result.slice(0, 10000);
      expect(prefix).toBe('x'.repeat(10000));
      expect(result.length).toBeLessThan(output.length);
    });
  });
});
