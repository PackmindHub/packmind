import { capitalize } from './stringUtils';

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
    expect(capitalize('standard')).toBe('Standard');
  });

  it('returns empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('does not change already capitalized string', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});
