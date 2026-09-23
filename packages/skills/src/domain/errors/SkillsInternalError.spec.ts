import { isDomainError, isInternalError } from '@packmind/types';
import { SkillsPortNotAvailableError } from './SkillsPortNotAvailableError';
import { SkillVersionMissingError } from './SkillVersionMissingError';

describe('SkillsPortNotAvailableError', () => {
  const error = new SkillsPortNotAvailableError('SpacesPort');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('port_not_available');
  });

  it('keeps the port in the context', () => {
    expect(error.context).toEqual({ port: 'SpacesPort' });
  });
});

describe('SkillVersionMissingError', () => {
  const error = new SkillVersionMissingError('skill-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('skill_version_missing');
  });

  it('keeps the skill in the context', () => {
    expect(error.context).toEqual({ skillId: 'skill-1' });
  });

  it('does not leak the skill id in the message', () => {
    expect(error.message).not.toContain('skill-1');
  });
});
