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
import { InvalidEmailOrPasswordError } from './InvalidEmailOrPasswordError';
import { TooManyLoginAttemptsError } from './TooManyLoginAttemptsError';

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

describe('InvalidEmailOrPasswordError', () => {
  const error = new InvalidEmailOrPasswordError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers unauthenticated', () => {
    expect(error.kind).toBe('unauthenticated');
  });

  it('carries the invalid_credentials reason', () => {
    expect(error.reason).toBe('invalid_credentials');
  });

  it('keeps an empty context, so the log never names the account', () => {
    expect(error.context).toEqual({});
  });
});

describe('TooManyLoginAttemptsError', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');
  const bannedUntil = new Date('2026-04-15T12:30:00.000Z');
  const error = new TooManyLoginAttemptsError(bannedUntil, now);

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers rate_limited', () => {
    expect(error.kind).toBe('rate_limited');
  });

  it('carries the too_many_login_attempts reason', () => {
    expect(error.reason).toBe('too_many_login_attempts');
  });

  it('keeps an empty context, so the log never names the account', () => {
    expect(error.context).toEqual({});
  });

  it('keeps the ban end', () => {
    expect(error.bannedUntil).toEqual(bannedUntil);
  });

  it('asks the caller to wait until the ban ends', () => {
    expect(error.retryAfterSeconds).toBe(30 * 60);
  });

  describe('when the ban ends within a fraction of a second', () => {
    it('rounds the wait up to a whole second', () => {
      const almost = new TooManyLoginAttemptsError(
        new Date(now.getTime() + 1500),
        now,
      );
      expect(almost.retryAfterSeconds).toBe(2);
    });
  });

  describe('when the ban has already ended', () => {
    it('never asks for less than one second', () => {
      const elapsed = new TooManyLoginAttemptsError(
        new Date(now.getTime() - 5000),
        now,
      );
      expect(elapsed.retryAfterSeconds).toBe(1);
    });
  });
});
