/**
 * Unit tests for timer utility functions
 * Validates: Requirements 6.2
 */

import { formatTimer } from './timer';

describe('formatTimer', () => {
  it('should format zero seconds as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('should format seconds less than a minute with zero-padded minutes', () => {
    expect(formatTimer(5)).toBe('00:05');
    expect(formatTimer(30)).toBe('00:30');
    expect(formatTimer(59)).toBe('00:59');
  });

  it('should format exactly one minute as 01:00', () => {
    expect(formatTimer(60)).toBe('01:00');
  });

  it('should format minutes and seconds with proper zero-padding', () => {
    expect(formatTimer(83)).toBe('01:23');
    expect(formatTimer(125)).toBe('02:05');
    expect(formatTimer(645)).toBe('10:45');
  });

  it('should format maximum typical session time (59:59)', () => {
    expect(formatTimer(3599)).toBe('59:59');
  });

  it('should handle double-digit minutes correctly', () => {
    expect(formatTimer(600)).toBe('10:00');
    expect(formatTimer(1234)).toBe('20:34');
    expect(formatTimer(2999)).toBe('49:59');
  });

  it('should always return MM:SS format with zero-padding', () => {
    const testCases = [0, 1, 9, 10, 59, 60, 61, 599, 600, 3599];
    
    testCases.forEach(seconds => {
      const result = formatTimer(seconds);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
