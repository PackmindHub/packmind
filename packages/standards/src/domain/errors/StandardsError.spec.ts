import {
  createRuleExampleId,
  createRuleId,
  createSpaceId,
  isDomainError,
  isInternalError,
} from '@packmind/types';
import { RuleNotInSpaceError } from './RuleNotInSpaceError';
import { RuleExampleNotFoundInSpaceError } from './RuleExampleNotFoundInSpaceError';

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
