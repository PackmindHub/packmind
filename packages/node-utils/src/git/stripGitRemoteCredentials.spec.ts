import { stripGitRemoteCredentials } from './stripGitRemoteCredentials';

describe('stripGitRemoteCredentials', () => {
  describe.each([
    [
      'an https remote carrying a token',
      'https://oauth2:glpat-secret@gitlab.acme.org/acme/app.git',
      'https://gitlab.acme.org/acme/app.git',
    ],
    [
      'an https remote carrying a user',
      'https://jdoe@gitlab.acme.org/acme/app.git',
      'https://gitlab.acme.org/acme/app.git',
    ],
    [
      'an http remote with a port',
      'http://x-access-token:ghp_secret@git.acme.org:8080/acme/app',
      'http://git.acme.org:8080/acme/app',
    ],
    [
      'an ssh:// remote carrying a password',
      'ssh://git:secret@gitlab.acme.org:2222/acme/app.git',
      'ssh://git@gitlab.acme.org:2222/acme/app.git',
    ],
  ])('with %s', (_label, remote, expected) => {
    it('drops the credentials', () => {
      expect(stripGitRemoteCredentials(remote)).toBe(expected);
    });
  });

  describe.each([
    ['an https remote', 'https://gitlab.acme.org/acme/app.git'],
    ['an scp-like SSH remote', 'git@gitlab.acme.org:acme/app.git'],
    ['an ssh:// remote', 'ssh://git@gitlab.acme.org:2222/acme/app.git'],
    ['a path holding an @', 'https://gitlab.acme.org/acme/app@v2.git'],
  ])('with %s', (_label, remote) => {
    it('keeps the remote', () => {
      expect(stripGitRemoteCredentials(remote)).toBe(remote);
    });
  });
});
