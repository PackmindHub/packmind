import { extractBaseUrl } from './extractBaseUrl';

describe('extractBaseUrl', () => {
  describe.each([
    [
      'an https remote',
      'https://gitlab.acme.io/acme/app.git',
      'https://gitlab.acme.io',
    ],
    [
      'an http remote',
      'http://gitlab.acme.io/acme/app.git',
      'http://gitlab.acme.io',
    ],
    [
      'an https remote with a port',
      'https://gitlab.acme.io:8443/acme/app.git',
      'https://gitlab.acme.io:8443',
    ],
    [
      'a remote carrying a user',
      'https://jdoe@gitlab.acme.io/acme/app.git',
      'https://gitlab.acme.io',
    ],
    [
      'an scp-like SSH remote',
      'git@gitlab.acme.io:acme/app.git',
      'https://gitlab.acme.io',
    ],
    [
      'an ssh:// remote with a port',
      'ssh://git@gitlab.acme.io:2222/acme/app.git',
      'https://gitlab.acme.io',
    ],
  ])('with %s', (_label, remote, expected) => {
    it(`returns ${expected}`, () => {
      expect(extractBaseUrl(remote)).toBe(expected);
    });
  });

  describe('when no host can be read', () => {
    it('returns the input', () => {
      expect(extractBaseUrl('not a remote')).toBe('not a remote');
    });
  });
});
