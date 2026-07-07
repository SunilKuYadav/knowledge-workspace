import { describe, it, expect } from 'vitest';
import { calculateInterval } from './confidence';

describe('calculateInterval', () => {
  it('halves the interval for confidence 1', () => {
    expect(calculateInterval(1, 10)).toBe(5);
  });

  it('keeps the interval the same for confidence 2', () => {
    expect(calculateInterval(2, 10)).toBe(10);
  });

  it('doubles the interval for confidence 3', () => {
    expect(calculateInterval(3, 10)).toBe(20);
  });

  it('triples the interval for confidence 4', () => {
    expect(calculateInterval(4, 10)).toBe(30);
  });

  it('quintuples the interval for confidence 5', () => {
    expect(calculateInterval(5, 10)).toBe(50);
  });

  it('returns minimum 1 day even when halving a 1-day interval', () => {
    expect(calculateInterval(1, 1)).toBe(1);
  });

  it('defaults previousInterval to 1 when not provided', () => {
    expect(calculateInterval(3)).toBe(2);
    expect(calculateInterval(1)).toBe(1);
  });

  it('treats 0 or negative previousInterval as 1', () => {
    expect(calculateInterval(3, 0)).toBe(2);
    expect(calculateInterval(3, -5)).toBe(2);
  });

  it('rounds the result to the nearest integer', () => {
    // 3 * 0.5 = 1.5 → rounds to 2
    expect(calculateInterval(1, 3)).toBe(2);
  });
});
