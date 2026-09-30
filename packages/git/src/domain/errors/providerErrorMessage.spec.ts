import { providerErrorMessage } from './providerErrorMessage';

function httpError(data: unknown): Error {
  return Object.assign(new Error('Request failed with status code 400'), {
    response: { status: 400, data },
  });
}

describe('providerErrorMessage', () => {
  describe('when GitLab explains the refusal in a message string', () => {
    it('returns the provider message', () => {
      expect(
        providerErrorMessage(
          httpError({
            message:
              "Commit message does not follow the pattern '^\\[FP-\\d*\\]'",
          }),
        ),
      ).toBe("Commit message does not follow the pattern '^\\[FP-\\d*\\]'");
    });
  });

  describe('when GitLab reports field errors in a message object', () => {
    it('joins each field with its errors', () => {
      expect(
        providerErrorMessage(
          httpError({
            message: { branch: ['is protected', 'is locked'], base: ['bad'] },
          }),
        ),
      ).toBe('branch is protected, is locked; base bad');
    });
  });

  describe('when GitHub adds details to its message', () => {
    it('appends each detail to the message', () => {
      expect(
        providerErrorMessage(
          httpError({
            message: 'Validation Failed',
            errors: [
              { message: 'Commit message must match a pattern' },
              { code: 'invalid' },
            ],
          }),
        ),
      ).toBe('Validation Failed: Commit message must match a pattern');
    });
  });

  describe('when GitHub reports a rule violation over several lines', () => {
    it('keeps the message without surrounding blank lines', () => {
      expect(
        providerErrorMessage(
          httpError({
            message:
              'Repository rule violations found\n\nCommit message must match\n\n',
          }),
        ),
      ).toBe('Repository rule violations found\n\nCommit message must match');
    });
  });

  describe('when the provider answers with an OAuth error', () => {
    it('returns the error description', () => {
      expect(
        providerErrorMessage(
          httpError({
            error: 'invalid_token',
            error_description: 'Token was revoked',
          }),
        ),
      ).toBe('Token was revoked');
    });
  });

  describe('when the response body carries no message', () => {
    it('falls back to the error message', () => {
      expect(providerErrorMessage(httpError('<html>Bad Gateway</html>'))).toBe(
        'Request failed with status code 400',
      );
    });
  });

  describe('when the failure never reached the provider', () => {
    it('returns the error message', () => {
      expect(providerErrorMessage(new Error('socket hang up'))).toBe(
        'socket hang up',
      );
    });
  });

  describe('when the failure is not an Error', () => {
    it('returns it as a string', () => {
      expect(providerErrorMessage('boom')).toBe('boom');
    });
  });
});
