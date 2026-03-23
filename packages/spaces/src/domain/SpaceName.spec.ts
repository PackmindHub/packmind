import { SpaceName } from './SpaceName';

describe('SpaceName', () => {
  describe('when the name is valid', () => {
    it('returns the trimmed value', () => {
      const spaceName = new SpaceName('  My Space  ');

      expect(spaceName.value).toBe('My Space');
    });
  });

  describe('when the name is exactly at the maximum length', () => {
    it('accepts the name', () => {
      const name = 'a'.repeat(SpaceName.MAX_LENGTH);
      const spaceName = new SpaceName(name);

      expect(spaceName.value).toBe(name);
    });
  });

  describe('when the name is empty', () => {
    it('throws InvalidSpaceNameError', () => {
      expect(() => new SpaceName('')).toThrow(
        'Invalid space name: name cannot be empty',
      );
    });
  });

  describe('when the name contains only whitespace', () => {
    it('throws InvalidSpaceNameError', () => {
      expect(() => new SpaceName('   ')).toThrow(
        'Invalid space name: name cannot be empty',
      );
    });
  });

  describe('when the name exceeds the maximum length', () => {
    it('throws InvalidSpaceNameError', () => {
      const longName = 'a'.repeat(SpaceName.MAX_LENGTH + 1);

      expect(() => new SpaceName(longName)).toThrow(
        `Invalid space name: name must not exceed ${SpaceName.MAX_LENGTH} characters`,
      );
    });
  });

  describe('when the name exceeds max length only due to whitespace padding', () => {
    it('accepts the trimmed name', () => {
      const paddedName = '  ' + 'a'.repeat(SpaceName.MAX_LENGTH) + '  ';
      const spaceName = new SpaceName(paddedName);

      expect(spaceName.value).toBe('a'.repeat(SpaceName.MAX_LENGTH));
    });
  });
});
