import { isDomainError, isInternalError } from '@packmind/types';
import { SkillParseError } from './SkillParseError';
import { SkillValidationError } from './SkillValidationError';
import { SkillEditForbiddenError } from './SkillEditForbiddenError';
import { SkillFileNotEditableError } from './SkillFileNotEditableError';
import { SkillSpaceNotAccessibleError } from './SkillSpaceNotAccessibleError';
import { SkillNotFoundError } from './SkillNotFoundError';
import { SkillFileNotFoundError } from './SkillFileNotFoundError';

describe('SkillParseError', () => {
  const error = new SkillParseError('Missing frontmatter');

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
    expect(error.reason).toBe('skill_parse_failed');
  });

  it('keeps the parse description as its message', () => {
    expect(error.message).toBe('Missing frontmatter');
  });
});

describe('SkillValidationError', () => {
  const errors = [
    { field: 'content', message: 'File content cannot be empty' },
  ];
  const error = new SkillValidationError(errors);

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
    expect(error.reason).toBe('skill_validation_failed');
  });

  it('keeps the validation errors in the context', () => {
    expect(error.context).toEqual({ validationErrors: errors });
  });

  it('keeps the validation errors on the public errors field', () => {
    expect(error.errors).toBe(errors);
  });
});

describe('SkillEditForbiddenError', () => {
  const error = new SkillEditForbiddenError('user-1', 'skill-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers forbidden', () => {
    expect(error.kind).toBe('forbidden');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('skill_edit_forbidden');
  });

  it('keeps the user and the skill in the context', () => {
    expect(error.context).toEqual({ userId: 'user-1', skillId: 'skill-1' });
  });

  it('does not leak the user id in the message', () => {
    expect(error.message).not.toContain('user-1');
  });

  it('does not leak the skill id in the message', () => {
    expect(error.message).not.toContain('skill-1');
  });
});

describe('SkillFileNotEditableError', () => {
  const error = new SkillFileNotEditableError('logo.png');

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
    expect(error.reason).toBe('skill_file_not_editable');
  });

  it('keeps the file path in the context', () => {
    expect(error.context).toEqual({ skillFilePath: 'logo.png' });
  });

  it('names the file path in the message', () => {
    expect(error.message).toContain('logo.png');
  });
});

describe('SkillSpaceNotAccessibleError', () => {
  const error = new SkillSpaceNotAccessibleError('space-1', 'org-1');

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

describe('SkillNotFoundError', () => {
  const error = new SkillNotFoundError('skill-1', 'space-1');

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
    expect(error.reason).toBe('skill_not_found');
  });

  it('keeps the skill and space in the context', () => {
    expect(error.context).toEqual({ skillId: 'skill-1', spaceId: 'space-1' });
  });

  it('does not leak the skill id in the message', () => {
    expect(error.message).not.toContain('skill-1');
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});

describe('SkillFileNotFoundError', () => {
  const error = new SkillFileNotFoundError('skill-1', 'reference.md');

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
    expect(error.reason).toBe('skill_file_not_found');
  });

  it('keeps the skill and the file path in the context', () => {
    expect(error.context).toEqual({
      skillId: 'skill-1',
      skillFilePath: 'reference.md',
    });
  });

  it('does not leak the skill id in the message', () => {
    expect(error.message).not.toContain('skill-1');
  });

  it('names the file path in the message', () => {
    expect(error.message).toContain('reference.md');
  });
});
