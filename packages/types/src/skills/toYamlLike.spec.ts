import { toYamlLike } from './toYamlLike';

describe('toYamlLike', () => {
  describe('primitives', () => {
    it('formats a string', () => {
      expect(toYamlLike('hello', 0)).toBe('hello');
    });

    it('formats a number', () => {
      expect(toYamlLike(42, 0)).toBe('42');
    });

    it('formats a boolean', () => {
      expect(toYamlLike(true, 0)).toBe('true');
    });
  });

  describe('null and undefined', () => {
    it('formats null as "null"', () => {
      expect(toYamlLike(null, 0)).toBe('null');
    });

    it('formats undefined as "null"', () => {
      expect(toYamlLike(undefined, 0)).toBe('null');
    });
  });

  describe('empty collections', () => {
    it('formats an empty array as "[]"', () => {
      expect(toYamlLike([], 0)).toBe('[]');
    });

    it('formats an empty object as "{}"', () => {
      expect(toYamlLike({}, 0)).toBe('{}');
    });
  });

  describe('simple arrays', () => {
    it('formats a flat array inline', () => {
      expect(toYamlLike([1, 2, 3], 0)).toBe('[1, 2, 3]');
    });

    it('formats a string array inline', () => {
      expect(toYamlLike(['a', 'b'], 0)).toBe('[a, b]');
    });
  });

  describe('nested arrays', () => {
    it('formats an array of objects', () => {
      const value = [{ name: 'a' }, { name: 'b' }];
      expect(toYamlLike(value, 0)).toBe('- name: a\n- name: b');
    });

    it('formats an array with nested arrays', () => {
      const value = [[{ a: 1 }], [{ b: 2 }]];
      expect(toYamlLike(value, 0)).toBe('-\n  - a: 1\n-\n  - b: 2');
    });
  });

  describe('flat objects', () => {
    it('formats key-value pairs', () => {
      expect(toYamlLike({ a: 1, b: 'two' }, 0)).toBe('a: 1\nb: two');
    });
  });

  describe('nested objects', () => {
    it('formats nested object with indentation', () => {
      const value = { outer: { inner: 'val' } };
      expect(toYamlLike(value, 0)).toBe('outer:\n  inner: val');
    });
  });

  describe('indentation', () => {
    it('respects the indent parameter', () => {
      expect(toYamlLike({ a: 1 }, 2)).toBe('    a: 1');
    });
  });
});
