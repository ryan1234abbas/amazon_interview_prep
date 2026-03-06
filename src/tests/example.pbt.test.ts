import * as fc from 'fast-check';

describe('Property-Based Testing Setup', () => {
  // Feature: interview-coach, Property: Example property to verify fast-check setup
  it('should verify fast-check is working correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (num) => {
          // Simple property: a number plus zero equals itself
          expect(num + 0).toBe(num);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: interview-coach, Property: String concatenation is associative
  it('should verify string concatenation properties', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (a, b) => {
          const result = a + b;
          expect(result.length).toBe(a.length + b.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
