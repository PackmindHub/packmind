import {
  gitHostOf,
  ownerReadingsOf,
  providerPathPrefix,
  sameGitHost,
} from './gitHost';

describe('gitHostOf', () => {
  describe.each([
    ['an https remote', 'https://gitlab.acme.io/acme/app.git'],
    ['an http remote', 'http://gitlab.acme.io/acme/app.git'],
    ['an scp-like SSH remote', 'git@gitlab.acme.io:acme/app.git'],
    [
      'an ssh:// remote with a port',
      'ssh://git@gitlab.acme.io:2222/acme/app.git',
    ],
    ['a git+ssh:// remote', 'git+ssh://git@gitlab.acme.io/acme/app.git'],
    ['a remote carrying a user', 'https://jdoe@gitlab.acme.io/acme/app.git'],
    [
      'a remote carrying credentials',
      'https://jdoe:secret@gitlab.acme.io/acme/app.git',
    ],
    ['a provider URL with a trailing slash', 'https://gitlab.acme.io/'],
    ['a provider URL with the default port', 'https://gitlab.acme.io:443'],
    ['a provider URL with a path prefix', 'https://gitlab.acme.io/gitlab'],
    ['a bare host', 'gitlab.acme.io'],
    ['a host in another case', 'https://GitLab.Acme.IO'],
  ])('with %s', (_label, url) => {
    it('returns the lowercased host', () => {
      expect(gitHostOf(url)).toBe('gitlab.acme.io');
    });
  });

  describe.each([
    ['an https IPv6 remote', 'https://[2001:db8::1]/acme/app.git'],
    [
      'an https IPv6 remote with a port',
      'https://[2001:db8::1]:8443/acme/app.git',
    ],
    ['an scp-like IPv6 SSH remote', 'git@[2001:db8::1]:acme/app.git'],
  ])('with %s', (_label, url) => {
    it('returns the bracketed address', () => {
      expect(gitHostOf(url)).toBe('[2001:db8::1]');
    });
  });

  describe.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['blanks', '   '],
  ])('with %s', (_label, url) => {
    it('returns null', () => {
      expect(gitHostOf(url)).toBeNull();
    });
  });
});

describe('sameGitHost', () => {
  describe('when an SSH remote points at the provider host', () => {
    it('returns true', () => {
      expect(
        sameGitHost(
          'https://gitlab.acme.io',
          'git@gitlab.acme.io:acme/app.git',
        ),
      ).toBe(true);
    });
  });

  describe('when the provider URL carries a path prefix', () => {
    it('returns true', () => {
      expect(
        sameGitHost(
          'https://devtools.acme.io/gitlab',
          'https://devtools.acme.io/gitlab/acme/app.git',
        ),
      ).toBe(true);
    });
  });

  describe('when the provider URL is a whole ssh:// remote', () => {
    it('returns true', () => {
      expect(
        sameGitHost(
          'ssh://git@gitlab.acme.io:2222/acme/app.git',
          'https://gitlab.acme.io',
        ),
      ).toBe(true);
    });
  });

  describe.each([
    ['a lookalike host', 'https://gitlab.acme.io.evil.com'],
    ['the parent domain', 'https://acme.io'],
    ['a sibling subdomain', 'https://git.acme.io'],
  ])('when the remote is on %s', (_label, remote) => {
    it('returns false', () => {
      expect(sameGitHost('https://gitlab.acme.io', remote)).toBe(false);
    });
  });

  describe('when two remotes are on different IPv6 hosts', () => {
    it('returns false', () => {
      expect(
        sameGitHost(
          'https://[2001:db8::1]/acme/app.git',
          'https://[2001:db8::2]/acme/app.git',
        ),
      ).toBe(false);
    });
  });

  describe('when an SSH remote points at the provider IPv6 host', () => {
    it('returns true', () => {
      expect(
        sameGitHost(
          'https://[2001:DB8::1]:8443',
          'ssh://git@[2001:db8::1]:2222/acme/app.git',
        ),
      ).toBe(true);
    });
  });

  describe('when the provider URL is null', () => {
    it('returns false', () => {
      expect(sameGitHost(null, 'https://gitlab.acme.io/acme/app.git')).toBe(
        false,
      );
    });
  });

  describe('when neither host can be read', () => {
    it('returns false', () => {
      expect(sameGitHost('', '')).toBe(false);
    });
  });
});

describe('providerPathPrefix', () => {
  describe.each([
    ['a URL at the root of its host', 'https://gitlab.acme.io', null],
    ['a URL with a trailing slash', 'https://gitlab.acme.io/', null],
    ['a URL under a prefix', 'https://devtools.acme.io/GitLab/', 'gitlab'],
    [
      'a URL under a nested prefix',
      'https://acme.io/tools/gitlab',
      'tools/gitlab',
    ],
    [
      'a whole ssh:// remote',
      'ssh://git@gitlab.acme.io:2222/acme/app.git',
      null,
    ],
    [
      'a URL under a prefix naming the API root',
      'https://devtools.acme.io/gitlab/api/v4',
      'gitlab',
    ],
    ['a URL naming the API root', 'https://gitlab.acme.io/api/v4/', null],
    ['null', null, null],
  ])('with %s', (_label, url, expected) => {
    it(`returns ${expected}`, () => {
      expect(providerPathPrefix(url)).toBe(expected);
    });
  });
});

describe('ownerReadingsOf', () => {
  const prefixed = 'https://devtools.acme.io/gitlab';

  describe('when a web remote is on a provider installed under a prefix', () => {
    it('reads the owner without the prefix', () => {
      expect(
        ownerReadingsOf(
          'gitlab/group/sub',
          prefixed,
          'https://devtools.acme.io/gitlab/group/sub/app.git',
        ),
      ).toEqual(['group/sub']);
    });
  });

  // GitLab leaves its relative URL root out of SSH clone URLs.
  describe('when an SSH remote is on a provider installed under a prefix', () => {
    it('reads the owner as is', () => {
      expect(
        ownerReadingsOf(
          'gitlab/group',
          prefixed,
          'git@devtools.acme.io:gitlab/group/app.git',
        ),
      ).toEqual(['gitlab/group']);
    });
  });

  describe('when the remote is on another host', () => {
    it('reads the owner as is', () => {
      expect(
        ownerReadingsOf(
          'gitlab/group',
          prefixed,
          'https://gitlab.other.io/gitlab/group/app.git',
        ),
      ).toEqual(['gitlab/group']);
    });
  });

  describe('when no remote is known', () => {
    it('reads the owner without the prefix too', () => {
      expect(ownerReadingsOf('GitLab/group', prefixed)).toEqual([
        'GitLab/group',
        'group',
      ]);
    });
  });

  describe('when the owner does not start with the prefix', () => {
    it('reads the owner as is', () => {
      expect(ownerReadingsOf('gitlabber/group', prefixed)).toEqual([
        'gitlabber/group',
      ]);
    });
  });

  describe('when the owner is the prefix alone', () => {
    it('reads the owner as is', () => {
      expect(ownerReadingsOf('gitlab', prefixed)).toEqual(['gitlab']);
    });
  });

  describe('when the provider sits at the root of its host', () => {
    it('reads the owner as is', () => {
      expect(
        ownerReadingsOf('gitlab/group', 'https://devtools.acme.io'),
      ).toEqual(['gitlab/group']);
    });
  });
});
