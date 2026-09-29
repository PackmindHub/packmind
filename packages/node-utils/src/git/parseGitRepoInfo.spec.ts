import { parseGitRepoInfo } from './parseGitRepoInfo';

describe('parseGitRepoInfo', () => {
  describe('when the remote has a GitLab subgroup', () => {
    it('keeps the whole group path as owner for an HTTPS remote', () => {
      expect(
        parseGitRepoInfo('https://gitlab.com/promyze/sandbox/quentin-nuxt.git'),
      ).toEqual({ owner: 'promyze/sandbox', repo: 'quentin-nuxt' });
    });

    it('keeps the whole group path as owner for an scp-like SSH remote', () => {
      expect(
        parseGitRepoInfo('git@gitlab.com:promyze/sandbox/quentin-nuxt.git'),
      ).toEqual({ owner: 'promyze/sandbox', repo: 'quentin-nuxt' });
    });

    it('keeps the whole group path as owner for an ssh:// remote with a port', () => {
      expect(
        parseGitRepoInfo('ssh://git@gitlab.example.com:2222/a/b/c/repo/'),
      ).toEqual({ owner: 'a/b/c', repo: 'repo' });
    });
  });

  it('parses a plain owner/repo remote', () => {
    expect(parseGitRepoInfo('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  describe('when the remote has no owner', () => {
    it('throws', () => {
      expect(() => parseGitRepoInfo('https://github.com/repo')).toThrow(
        'Unable to parse git remote URL: https://github.com/repo',
      );
    });
  });
});
