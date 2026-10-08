import { parseOwnerRepo } from './TrackRepositoryUseCase';

describe('parseOwnerRepo', () => {
  describe('when the remote has a GitLab subgroup', () => {
    it('keeps the whole group path as owner for an HTTPS remote', () => {
      expect(
        parseOwnerRepo('https://gitlab.com/promyze/sandbox/quentin-nuxt.git'),
      ).toEqual({ owner: 'promyze/sandbox', repo: 'quentin-nuxt' });
    });

    it('keeps the whole group path as owner for an scp-like SSH remote', () => {
      expect(
        parseOwnerRepo('git@gitlab.com:promyze/sandbox/quentin-nuxt.git'),
      ).toEqual({ owner: 'promyze/sandbox', repo: 'quentin-nuxt' });
    });
  });

  it('parses a plain owner/repo remote', () => {
    expect(parseOwnerRepo('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  describe('when an scp-like remote names an absolute path', () => {
    it('ignores the leading slash', () => {
      expect(parseOwnerRepo('git@gitlab.acme.io:/acme/app.git')).toEqual({
        owner: 'acme',
        repo: 'app',
      });
    });
  });

  describe('when the remote has no owner', () => {
    it('throws', () => {
      expect(() => parseOwnerRepo('https://github.com/repo')).toThrow(
        'Unable to parse git remote URL: https://github.com/repo',
      );
    });
  });
});
