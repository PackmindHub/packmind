import { isDomainError, isInternalError } from '@packmind/types';
import { StandardsInternalError } from './StandardsInternalError';

describe('StandardsInternalError', () => {
  const error = new StandardsInternalError(
    'standard_version_missing',
    { standardId: 'standard-1' },
    'No versions found for standard standard-1',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('standard_version_missing');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ standardId: 'standard-1' });
  });
});
