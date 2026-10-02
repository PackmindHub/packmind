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
import {
  DistributionHistoryEntry,
  Package,
  PackmindLockFile,
  Standard,
} from '@packmind/types';

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
      // Tracked repo and branch: a regular install records a distribution, so
      // the check below can show that `--check-upgrades` does not.
      await context.runCli('git track');

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
        expect(result.stdout).toMatchOutput(`${packageSlug()}  0.1.0 → 0.2.0`);
      });

      it('lists the standard as updated', () => {
        expect(result.stdout).toMatchOutput(
          '~ standard  Upgradable standard  v',
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

    describe('distribution recording', () => {
      let distributionsBefore: DistributionHistoryEntry[];
      let distributionsAfter: DistributionHistoryEntry[];

      const listDistributions = () =>
        context.gateway.deployments.listDeploymentsByPackage(
          context.space.id,
          pkg.id,
        );

      beforeEach(async () => {
        distributionsBefore = await listDistributions();
        await context.runCli('install --check-upgrades');
        distributionsAfter = await listDistributions();
      });

      it('records a distribution for the initial install', () => {
        expect(distributionsBefore.length).toBeGreaterThan(0);
      });

      it('is not recorded as a distribution', () => {
        expect(distributionsAfter).toHaveLength(distributionsBefore.length);
      });
    });

    describe('when the package is tracked at `*`', () => {
      let result: RunCliResult;
      let configBefore: string;

      const packagesInConfig = (): Record<string, string> =>
        JSON.parse(readFile('packmind.json', context.testDir)).packages;

      beforeEach(async () => {
        await context.runCli(`install ${packageSlug()}:*`);

        const command = await context.gateway.commands.create({
          name: 'Added after install',
          summary: 'A command added to the package after the install',
          spaceId: context.space.id,
          steps: [{ name: 'Step one', description: 'Do the thing' }],
        });
        await context.gateway.packages.addArtefacts({
          spaceId: context.space.id,
          packageId: pkg.id,
          recipeIds: [command.id],
        });

        configBefore = readFile('packmind.json', context.testDir);
        result = await context.runCli('install --check-upgrades');
      });

      it('tracks the package at `*` before the check', () => {
        expect(JSON.parse(configBefore).packages[packageSlug()]).toBe('*');
      });

      it('exits with code 1', () => {
        expect(result.returnCode).toBe(1);
      });

      it('shows the package at `*` with one component to update', () => {
        expect(result.stdout).toMatchOutput(
          `${packageSlug()}  * · 1 component to update`,
        );
      });

      it('lists the new command as added', () => {
        expect(result.stdout).toMatchOutput(
          '+ command   Added after install  (new)',
        );
      });

      it('keeps the package tracked at `*` in packmind.json', () => {
        expect(packagesInConfig()[packageSlug()]).toBe('*');
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
