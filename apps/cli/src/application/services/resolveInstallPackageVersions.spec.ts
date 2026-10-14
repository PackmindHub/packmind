import {
  releasePins,
  resolveInstallPackageVersions,
} from './resolveInstallPackageVersions';

describe('releasePins', () => {
  const versions = { '@space/pinned': '0.1.0', '@space/live': '*' };

  describe('when upgrade is false', () => {
    it('keeps every entry', () => {
      expect(releasePins(versions, false)).toEqual(versions);
    });
  });

  describe('when upgrade is true', () => {
    it('drops exact pins and keeps the wildcard', () => {
      expect(releasePins(versions, true)).toEqual({ '@space/live': '*' });
    });
  });
});

describe('resolveInstallPackageVersions', () => {
  const configSlugs = ['@space/pinned', '@space/live'];
  const configVersions = { '@space/pinned': '0.1.0', '@space/live': '*' };

  describe('when no package is named on the command line', () => {
    it('installs the config packages', () => {
      const { packagesSlugs } = resolveInstallPackageVersions({
        configSlugs,
        configVersions,
        upgrade: false,
      });

      expect(packagesSlugs).toEqual(['@space/pinned', '@space/live']);
    });

    it('asks for what packmind.json records', () => {
      const { packageVersions } = resolveInstallPackageVersions({
        configSlugs,
        configVersions,
        upgrade: false,
      });

      expect(packageVersions).toEqual(configVersions);
    });

    describe('when upgrade is true', () => {
      it('releases the exact pins', () => {
        const { packageVersions } = resolveInstallPackageVersions({
          configSlugs,
          configVersions,
          upgrade: true,
        });

        expect(packageVersions).toEqual({ '@space/live': '*' });
      });
    });
  });

  describe('when packages are named on the command line', () => {
    const explicitPackages = [
      {
        slug: '@space/new',
        versionSpec: { kind: 'exact' as const, version: '1.0.0' },
      },
      { slug: '@space/pinned' },
    ];

    it('adds them after the config packages without duplicates', () => {
      const { packagesSlugs } = resolveInstallPackageVersions({
        configSlugs,
        configVersions,
        explicitPackages,
        upgrade: false,
      });

      expect(packagesSlugs).toEqual([
        '@space/pinned',
        '@space/live',
        '@space/new',
      ]);
    });

    it('asks for the typed version and keeps the config pin otherwise', () => {
      const { packageVersions } = resolveInstallPackageVersions({
        configSlugs,
        configVersions,
        explicitPackages,
        upgrade: false,
      });

      expect(packageVersions).toEqual({
        '@space/pinned': '0.1.0',
        '@space/live': '*',
        '@space/new': '1.0.0',
      });
    });

    describe('when a named package has no typed version and no config entry', () => {
      it('leaves it out so the server answers with the newest release', () => {
        const { packageVersions } = resolveInstallPackageVersions({
          configSlugs: [],
          configVersions: {},
          explicitPackages: [{ slug: '@space/ops' }],
          upgrade: false,
        });

        expect(packageVersions).toEqual({});
      });
    });
  });
});
