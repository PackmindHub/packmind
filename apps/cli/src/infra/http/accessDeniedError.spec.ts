import { isAccessDeniedError } from './accessDeniedError';

describe('isAccessDeniedError', () => {
  const withReason = (reason: string) =>
    Object.assign(new Error('refused'), { statusCode: 404, reason });

  describe('when the account behind the API key no longer resolves', () => {
    it('recognises the error as an access failure', () => {
      expect(isAccessDeniedError(withReason('user_not_found'))).toBe(true);
    });
  });

  describe('when the caller is not a member of the space', () => {
    it('recognises the error as an access failure', () => {
      expect(isAccessDeniedError(withReason('space_membership_required'))).toBe(
        true,
      );
    });
  });

  describe('when the caller lacks a role', () => {
    it.each([
      'user_not_in_organization',
      'user_not_an_admin',
      'space_admin_required',
    ])('recognises %s as an access failure', (reason) => {
      expect(isAccessDeniedError(withReason(reason))).toBe(true);
    });
  });

  // Older servers and every non-domain error send no discriminator at all, so
  // the guarded 404 branches must keep their current behaviour.
  describe('when the error carries no reason', () => {
    it('does not recognise it as an access failure', () => {
      expect(
        isAccessDeniedError(
          Object.assign(new Error('Not Found'), { statusCode: 404 }),
        ),
      ).toBe(false);
    });
  });

  describe('when the reason means something other than a refusal', () => {
    it('does not recognise it as an access failure', () => {
      expect(isAccessDeniedError(withReason('repository_not_tracked'))).toBe(
        false,
      );
    });
  });

  // `reason` is read off an unknown value, so an inherited property name must
  // not be mistaken for a listed reason.
  describe('when the reason is an Object prototype member', () => {
    it('does not recognise it as an access failure', () => {
      expect(isAccessDeniedError(withReason('toString'))).toBe(false);
    });
  });

  describe('when there is no error object', () => {
    it.each([undefined, null, 'boom'])('does not throw on %p', (candidate) => {
      expect(isAccessDeniedError(candidate)).toBe(false);
    });
  });
});
