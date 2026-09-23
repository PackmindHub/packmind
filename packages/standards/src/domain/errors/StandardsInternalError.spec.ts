import { isDomainError, isInternalError } from '@packmind/types';
import { StandardsInternalError } from './StandardsInternalError';
import { StandardVersionMissingError } from './StandardVersionMissingError';
import { StandardsAdapterPortsMissingError } from './StandardsAdapterPortsMissingError';
import { StandardsHexaDependencyMissingError } from './StandardsHexaDependencyMissingError';

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

describe('StandardVersionMissingError', () => {
  const error = new StandardVersionMissingError('standard-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('standard_version_missing');
  });

  it('keeps the standard in the context', () => {
    expect(error.context).toEqual({ standardId: 'standard-1' });
  });

  it('does not leak the standard id in the message', () => {
    expect(error.message).not.toContain('standard-1');
  });
});

describe('StandardsAdapterPortsMissingError', () => {
  const error = new StandardsAdapterPortsMissingError([
    'ISpacesPort',
    'eventEmitterService',
  ]);

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('standards_adapter_ports_missing');
  });

  it('keeps the missing ports in the context', () => {
    expect(error.context).toEqual({
      missingPorts: ['ISpacesPort', 'eventEmitterService'],
    });
  });
});

describe('StandardsHexaDependencyMissingError', () => {
  const error = new StandardsHexaDependencyMissingError('JobsService');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('hexa_dependency_missing');
  });

  it('keeps the dependency in the context', () => {
    expect(error.context).toEqual({ dependency: 'JobsService' });
  });
});
