import { renderHook } from '@testing-library/react';
import { useArtifactNameValidator } from './useArtifactNameValidator';

describe('useArtifactNameValidator', () => {
  const existingNames = ['My Standard', 'Another Standard'];

  describe('when name matches an existing name', () => {
    it('returns error message', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('My Standard')).toBe(
        'An artifact with this name already exists in this space',
      );
    });
  });

  describe('when name matches case-insensitively', () => {
    it('returns error message', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('my standard')).toBe(
        'An artifact with this name already exists in this space',
      );
    });
  });

  describe('when name is unique', () => {
    it('returns null', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('Brand New Standard')).toBeNull();
    });
  });

  describe('when excludeName is provided', () => {
    it('does not flag the excluded name as duplicate', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames, 'My Standard'),
      );

      expect(result.current('My Standard')).toBeNull();
    });

    it('still flags other duplicates', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames, 'My Standard'),
      );

      expect(result.current('Another Standard')).toBe(
        'An artifact with this name already exists in this space',
      );
    });
  });

  describe('when name is empty', () => {
    it('returns null', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('')).toBeNull();
    });
  });

  describe('when name is whitespace only', () => {
    it('returns null', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('   ')).toBeNull();
    });
  });

  describe('when name has leading/trailing whitespace matching an existing name', () => {
    it('returns error message after trimming', () => {
      const { result } = renderHook(() =>
        useArtifactNameValidator(existingNames),
      );

      expect(result.current('  My Standard  ')).toBe(
        'An artifact with this name already exists in this space',
      );
    });
  });
});
