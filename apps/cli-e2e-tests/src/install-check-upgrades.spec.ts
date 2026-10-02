import {
  describeForVersion,
  describeWithUserSignedUp,
  readFile,
  RunCliResult,
  runCli,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from './helpers';
import { describeWithTempSpace } from './helpers/describeWithTempSpace';
import { Package, PackmindLockFile, Standard } from '@packmind/types';

/**
 * `install --check-upgrades`: what `install --upgrade` would change, without
 * writing or recording anything.
 *
 * The scenario: a repo pinned to release 0.1.0 of a package, and a 0.2.0
 * release cut after the standard it carries was edited.
 */
/*
 * Strictly greater than the latest published CLI (0.36.1), which ships
 * without `--check-upgrades`: the registry leg would otherwise run these
 * scenarios against a binary that does not know the flag.
 */
describeForVersion('> 0.36.1', 'install --check-upgrades', () => {
  describeWithUserSignedUp('install --check-upgrades', (getContext) => {
    let context: UserSignedUpContext;
    let pkg: Package;
    let standard: Standard;
    let standardFile: string;

    const packageSlug = () => `@${context.space.slug}/${pkg.slug}`;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {}, agents: ['claude'] }, null, 2),
        context.testDir,
      );

      standard = (
        await context.gateway.standards.create({
          name: 'Upgradable standard',
          description: 'Original description',
          rules: [],
          scope: null,
          spaceId: context.space.id,
        })
      ).standard;

      pkg = (
        await context.gateway.packages.create({
          name: 'Upgradable',
          description: 'Package released twice',
          recipeIds: [],
          standardIds: [standard.id],
          spaceId: context.space.id,
        })
      ).package;

      await context.gateway.packages.createRelease({
        spaceId: context.space.id,
        packageId: pkg.id,
        version: '0.1.0',
      });

      await context.runCli(`install ${packageSlug()}:0.1.0`);

      const lockFile: PackmindLockFile = JSON.parse(
        readFile('packmind-lock.json', context.testDir),
      );
      standardFile =
        lockFile.artifacts[`user:standard:${standard.slug}`].files[0].path;

      await context.gateway.standards.update({
        spaceId: context.space.id,
        standardId: standard.id,
        name: standard.name,
        description: 'Updated description',
        rules: [],
        scope: null,
      });

      await context.gateway.packages.createRelease({
        spaceId: context.space.id,
        packageId: pkg.id,
        version: '0.2.0',
      });
    });

    describe('when a newer release is available', () => {
      let result: RunCliResult;
      let configBefore: string;
      let lockBefore: string;
      let standardBefore: string;

      beforeEach(async () => {
        configBefore = readFile('packmind.json', context.testDir);
        lockBefore = readFile('packmind-lock.json', context.testDir);
        standardBefore = readFile(standardFile, context.testDir);

        result = await context.runCli('install --check-upgrades');
      });

      it('exits with code 1', () => {
        expect(result.returnCode).toBe(1);
      });

      it('shows the package moving to the newer release', () => {
        expect(result.stdout).toContain('0.1.0 → 0.2.0');
      });

      it('lists the standard as updated', () => {
        expect(result.stdout).toMatch(
          /~ standard\s+Upgradable standard\s+v\d+ → v\d+/,
        );
      });

      it('leaves packmind.json untouched', () => {
        expect(readFile('packmind.json', context.testDir)).toBe(configBefore);
      });

      it('leaves packmind-lock.json untouched', () => {
        expect(readFile('packmind-lock.json', context.testDir)).toBe(
          lockBefore,
        );
      });

      it('leaves the installed standard untouched', () => {
        expect(readFile(standardFile, context.testDir)).toBe(standardBefore);
      });
    });

    describe('when the upgrade has been applied', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        await context.runCli('install --upgrade');
        result = await context.runCli('install --check-upgrades');
      });

      it('exits with code 0', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports that everything is up to date', () => {
        expect(result.stdout).toContain('Already up to date');
      });
    });
  });

  describeWithTempSpace(
    'install --check-upgrades combined with --upgrade',
    (getContext) => {
      let result: RunCliResult;

      beforeEach(async () => {
        const { testDir } = await getContext();
        result = await runCli('install --check-upgrades --upgrade', {
          cwd: testDir,
        });
      });

      it('exits with code 1', () => {
        expect(result.returnCode).toBe(1);
      });

      it('explains that the two flags cannot be combined', () => {
        expect(result.stderr).toContain(
          '--check-upgrades cannot be combined with --upgrade.',
        );
      });
    },
  );
});
