import { isDomainError, isInternalError } from '@packmind/types';
import { EmailAlreadyExistsError } from './EmailAlreadyExistsError';
import { OrganizationSlugConflictError } from './OrganizationNameConflictError';
import { InvitationBatchEmptyError } from './InvitationBatchEmptyError';
import { InvalidInvitationEmailError } from './InvalidInvitationEmailError';
import { InvitationNotFoundError } from './InvitationNotFoundError';
import { InvitationExpiredError } from './InvitationExpiredError';
import { PasswordResetTokenNotFoundError } from './PasswordResetTokenNotFoundError';
import { PasswordResetTokenExpiredError } from './PasswordResetTokenExpiredError';
import { UserCannotExcludeSelfError } from './UserCannotExcludeSelfError';
import { InvalidOrganizationNameError } from './InvalidOrganizationNameError';
import { InvalidDisplayNameError } from './InvalidDisplayNameError';
import { MissingEmailError } from './MissingEmailError';
import { OrganizationNotFoundError } from './OrganizationNotFoundError';
import { CliLoginCodeNotFoundError } from './CliLoginCodeNotFoundError';
import { CliLoginCodeExpiredError } from './CliLoginCodeExpiredError';
import { CliLoginCodeUserNotFoundError } from './CliLoginCodeUserNotFoundError';
import { CliLoginCodeMembershipNotFoundError } from './CliLoginCodeMembershipNotFoundError';
import { CliLoginCodeOrganizationNotFoundError } from './CliLoginCodeOrganizationNotFoundError';
import { CliLoginCodeApiKeyError } from './CliLoginCodeApiKeyError';

describe('EmailAlreadyExistsError', () => {
  const error = new EmailAlreadyExistsError('test@example.com');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps only the masked email in the context', () => {
    expect(error.context.email).not.toContain('example.com');
  });
});

describe('OrganizationSlugConflictError', () => {
  const error = new OrganizationSlugConflictError('Test Org');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps the organization name in the context', () => {
    expect(error.context).toEqual({ organizationName: 'Test Org' });
  });

  it('names the conflicting name in the message', () => {
    expect(error.message).toContain('Test Org');
  });
});

describe('InvitationBatchEmptyError', () => {
  const error = new InvitationBatchEmptyError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('InvalidInvitationEmailError', () => {
  const error = new InvalidInvitationEmailError('test@example.com');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps only the masked email in the context', () => {
    expect(error.context.email).not.toContain('example.com');
  });

  it('masks the email in the message', () => {
    expect(error.message).not.toContain('example.com');
  });

  it('includes asterisks in the masked email', () => {
    expect(error.message).toContain('*');
  });
});

describe('InvitationNotFoundError', () => {
  const error = new InvitationNotFoundError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });
});

describe('InvitationExpiredError', () => {
  const error = new InvitationExpiredError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found for anti-enumeration', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason, distinct from a missing invitation', () => {
    expect(error.reason).toBe('invitation_expired');
  });
});

describe('PasswordResetTokenNotFoundError', () => {
  const error = new PasswordResetTokenNotFoundError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });
});

describe('PasswordResetTokenExpiredError', () => {
  const error = new PasswordResetTokenExpiredError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('reads exactly like a token that was never found', () => {
    expect(error.message).toBe(new PasswordResetTokenNotFoundError().message);
  });

  it('uses the same reason as PasswordResetTokenNotFoundError for anti-enumeration', () => {
    expect(error.reason).toBe(new PasswordResetTokenNotFoundError().reason);
  });
});

describe('UserCannotExcludeSelfError', () => {
  const error = new UserCannotExcludeSelfError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('InvalidOrganizationNameError', () => {
  const error = new InvalidOrganizationNameError('Bad!@#$%');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the organization name in the context', () => {
    expect(error.context).toEqual({ organizationName: 'Bad!@#$%' });
  });

  it('names the provided name in the message', () => {
    expect(error.message).toContain('Bad!@#$%');
  });
});

describe('InvalidDisplayNameError', () => {
  const error = new InvalidDisplayNameError('too long');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the detail in the context', () => {
    expect(error.context).toEqual({ displayNameDetail: 'too long' });
  });

  describe('when created with tooLong()', () => {
    const tooLongError = InvalidDisplayNameError.tooLong();

    it('is still a domain error', () => {
      expect(isDomainError(tooLongError)).toBe(true);
    });

    it('mentions the length limit', () => {
      expect(tooLongError.message).toContain('255');
    });
  });
});

describe('MissingEmailError', () => {
  const error = new MissingEmailError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('OrganizationNotFoundError', () => {
  const error = new OrganizationNotFoundError('org-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a dangling reference is never a 404', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('keeps the organization in the context', () => {
    expect(error.context).toEqual({ organizationId: 'org-1' });
  });
});

describe('CliLoginCodeNotFoundError', () => {
  const error = new CliLoginCodeNotFoundError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });
});

describe('CliLoginCodeExpiredError', () => {
  const error = new CliLoginCodeExpiredError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found for anti-enumeration', () => {
    expect(error.kind).toBe('not_found');
  });

  it('reads exactly like a code that was never found', () => {
    expect(error.message).toBe(new CliLoginCodeNotFoundError().message);
  });
});

describe('CliLoginCodeUserNotFoundError', () => {
  const error = new CliLoginCodeUserNotFoundError('user-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the user in the context', () => {
    expect(error.context).toEqual({ userId: 'user-1' });
  });

  it('reads exactly like a code that was never found', () => {
    expect(error.message).toBe(new CliLoginCodeNotFoundError().message);
  });
});

describe('CliLoginCodeMembershipNotFoundError', () => {
  const error = new CliLoginCodeMembershipNotFoundError('user-1', 'org-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps both the user and organization in the context', () => {
    expect(error.context).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
    });
  });

  it('reads exactly like a code that was never found', () => {
    expect(error.message).toBe(new CliLoginCodeNotFoundError().message);
  });
});

describe('CliLoginCodeOrganizationNotFoundError', () => {
  const error = new CliLoginCodeOrganizationNotFoundError('org-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a dangling reference is never a 404', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('keeps the organization in the context', () => {
    expect(error.context).toEqual({ organizationId: 'org-1' });
  });
});

describe('CliLoginCodeApiKeyError', () => {
  const error = new CliLoginCodeApiKeyError();

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a wiring fault is never a 4xx', () => {
    expect(isDomainError(error)).toBe(false);
  });
});
