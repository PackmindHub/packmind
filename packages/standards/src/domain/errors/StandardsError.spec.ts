import {
  createRuleExampleId,
  createRuleId,
  createSpaceId,
  isDomainError,
  isInternalError,
} from '@packmind/types';
import { RuleNotInSpaceError } from './RuleNotInSpaceError';
import { RuleExampleNotFoundInSpaceError } from './RuleExampleNotFoundInSpaceError';
import { RuleNotFoundError } from './RuleNotFoundError';
import { StandardSpaceNotAccessibleError } from './StandardSpaceNotAccessibleError';
import { StandardNotFoundError } from './StandardNotFoundError';
import { StandardSlugNotFoundError } from './StandardSlugNotFoundError';
import { RuleExampleInvalidError } from './RuleExampleInvalidError';

describe('RuleNotInSpaceError', () => {
  const error = new RuleNotInSpaceError(
    createRuleId('rule-1'),
    createSpaceId('space-1'),
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('rule_not_found');
  });

  it('keeps the rule and space in the context', () => {
    expect(error.context).toEqual({ ruleId: 'rule-1', spaceId: 'space-1' });
  });

  it('does not leak the rule id in the message', () => {
    expect(error.message).not.toContain('rule-1');
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});

describe('RuleExampleNotFoundInSpaceError', () => {
  const error = new RuleExampleNotFoundInSpaceError(
    createRuleExampleId('example-1'),
    createSpaceId('space-1'),
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('rule_example_not_found');
  });

  it('keeps the rule example and space in the context', () => {
    expect(error.context).toEqual({
      ruleExampleId: 'example-1',
      spaceId: 'space-1',
    });
  });

  it('does not leak the rule example id in the message', () => {
    expect(error.message).not.toContain('example-1');
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});

describe('RuleNotFoundError', () => {
  const error = new RuleNotFoundError(createRuleId('rule-1'));

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('rule_not_found');
  });

  it('keeps the rule in the context', () => {
    expect(error.context).toEqual({ ruleId: 'rule-1' });
  });

  it('does not leak the rule id in the message', () => {
    expect(error.message).not.toContain('rule-1');
  });
});

describe('StandardSpaceNotAccessibleError', () => {
  const error = new StandardSpaceNotAccessibleError('space-1', 'org-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('space_not_accessible');
  });

  it('keeps the space and organization in the context', () => {
    expect(error.context).toEqual({
      spaceId: 'space-1',
      organizationId: 'org-1',
    });
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });

  it('does not leak the organization id in the message', () => {
    expect(error.message).not.toContain('org-1');
  });
});

describe('StandardNotFoundError', () => {
  const error = new StandardNotFoundError('standard-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('standard_not_found');
  });

  it('keeps the standard and space in the context', () => {
    expect(error.context).toEqual({
      standardId: 'standard-1',
      spaceId: 'space-1',
    });
  });

  it('does not leak the standard id in the message', () => {
    expect(error.message).not.toContain('standard-1');
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});

describe('StandardSlugNotFoundError', () => {
  const error = new StandardSlugNotFoundError('my-standard', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('standard_not_found');
  });

  it('keeps the slug and space in the context', () => {
    expect(error.context).toEqual({
      standardSlug: 'my-standard',
      spaceId: 'space-1',
    });
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});

describe('RuleExampleInvalidError', () => {
  const error = new RuleExampleInvalidError('Language cannot be empty', {
    ruleExampleId: 'example-1',
  });

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('rule_example_invalid');
  });

  it('keeps the rule example in the context', () => {
    expect(error.context).toEqual({ ruleExampleId: 'example-1' });
  });

  it('does not leak the rule example id in the message', () => {
    expect(error.message).not.toContain('example-1');
  });

  it('keeps what to fix as its message', () => {
    expect(error.message).toBe('Language cannot be empty');
  });
});
