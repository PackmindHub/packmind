import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  readFile,
  updateFile,
  fileExists,
  UserSignedUpContext,
} from './helpers';
import { Package } from '@packmind/types';
import fs from 'fs';

describeForVersion('>= 0.24.0', 'install command', () => {
  describeWithUserSignedUp('install command', (getContext) => {
    let context: UserSignedUpContext;
    let pkg: Package;
    let installResult: RunCliResult;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      // Create a package with both commands
      const createPackageResponse = await context.gateway.packages.create({
        name: 'My package',
        description: 'Test package for diff command',
        recipeIds: [],
        standardIds: [],
        spaceId: context.space.id,
      });
      pkg = createPackageResponse.package;
    });

    describe('when user specifies the packages to install in the command line', () => {
      describe('when user does not specify the space slug', () => {
        beforeEach(async () => {
          installResult = await context.runCli(`install ${pkg.slug}`);
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('references the space slug in the packmind.json file', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });

      describe('when user specifies the space slug', () => {
        beforeEach(async () => {
          installResult = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}`,
          );
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('references the space slug in the packmind.json file', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });
    });

    describe('when content to install is read from packmind.json', () => {
      describe('when packages are not prefixed by space slug', () => {
        beforeEach(async () => {
          updateFile(
            'packmind.json',
            JSON.stringify({ packages: { [pkg.slug]: '*' } }),
            context.testDir,
          );

          installResult = await context.runCli(`install`);
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('updates the packmind.json file with a prefixed label of the package', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });
    });

    describe('when using --path to scope install to a subdirectory', () => {
      beforeEach(async () => {
        fs.mkdirSync(`${context.testDir}/apps/frontend`, { recursive: true });

        installResult = await context.runCli(
          `install ${pkg.slug} --path apps/frontend`,
        );
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('creates packmind.json in the target directory with normalized slug', () => {
        const packmindJson = readFile(
          'apps/frontend/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('does not create packmind.json at the root', () => {
        expect(fileExists('packmind.json', context.testDir)).toBe(false);
      });
    });

    describe('when installing recursively across multiple directories', () => {
      beforeEach(async () => {
        // Create packmind.json at root and in a subdirectory
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );
        fs.mkdirSync(`${context.testDir}/apps/sub`, { recursive: true });
        updateFile(
          'apps/sub/packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );

        installResult = await context.runCli(`install`);
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('normalizes slugs in root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('normalizes slugs in subdirectory packmind.json', () => {
        const packmindJson = readFile(
          'apps/sub/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });
    });

    describe('when comparing scoped and unscoped slugs', () => {
      let unscopedResult: RunCliResult;
      let scopedResult: RunCliResult;

      beforeEach(async () => {
        fs.mkdirSync(`${context.testDir}/dir-unscoped`, { recursive: true });
        fs.mkdirSync(`${context.testDir}/dir-scoped`, { recursive: true });

        unscopedResult = await context.runCli(
          `install ${pkg.slug} --path dir-unscoped`,
        );
        scopedResult = await context.runCli(
          `install @${context.space.slug}/${pkg.slug} --path dir-scoped`,
        );
      });

      it('succeeds with unscoped slug', () => {
        expect(unscopedResult.returnCode).toBe(0);
      });

      it('succeeds with scoped slug', () => {
        expect(scopedResult.returnCode).toBe(0);
      });

      it('normalizes the unscoped slug in packmind.json', () => {
        const unscopedJson = readFile(
          'dir-unscoped/packmind.json',
          context.testDir,
        );

        expect(unscopedJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('keeps the scoped slug in packmind.json', () => {
        const scopedJson = readFile(
          'dir-scoped/packmind.json',
          context.testDir,
        );

        expect(scopedJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });
    });

    describe('when packmind.json does not exist (fresh install)', () => {
      let pkgWithSkills: Package;

      beforeEach(async () => {
        // Create a package containing at least one skill so the capability
        // warning fires when only AGENTS.md / packmind agents are configured.
        // The e2e gateway currently does not expose a helper to attach skills
        // to a test package, so the package is created empty for now and the
        // skill-capability assertion below stays skipped.
        const created = await context.gateway.packages.create({
          name: 'Skills test package',
          description: 'Has skills only',
          recipeIds: [],
          standardIds: [],
          spaceId: context.space.id,
        });
        pkgWithSkills = created.package;
      });

      describe('and the user runs install <package>', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          // Confirm packmind.json does not exist yet
          expect(fileExists('packmind.json', context.testDir)).toBe(false);

          result = await context.runCli(
            `install @${context.space.slug}/${pkgWithSkills.slug}`,
          );
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('creates packmind.json with the package', () => {
          expect(fileExists('packmind.json', context.testDir)).toBe(true);
          const content = readFile('packmind.json', context.testDir);
          expect(content).toContain(pkgWithSkills.slug);
        });

        it('reports that packmind.json was created in stdout', () => {
          expect(result.stdout).toContain('Created packmind.json');
        });

        it('never emits the bare "Nothing to install" message', () => {
          expect(result.stdout).not.toContain('Nothing to install');
        });

        // TODO: enable once the e2e gateway can publish skills into a test
        // package. With AGENTS.md/packmind as default agents, the CLI should
        // print the capability warning naming "skills".
        it.skip('warns when configured agents lack skill capability', () => {
          expect(result.stdout).toContain('could not be rendered');
          expect(result.stdout).toContain('skills');
          expect(result.stdout).toContain('packmind-cli config agents');
        });
      });
    });

    describe('when using --path to scope recursive install to a subtree', () => {
      beforeEach(async () => {
        // Create packmind.json at root and in a subdirectory
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );
        fs.mkdirSync(`${context.testDir}/apps/backend`, { recursive: true });
        updateFile(
          'apps/backend/packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );

        installResult = await context.runCli(`install --path apps/backend`);
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('normalizes slugs in the target subdirectory', () => {
        const packmindJson = readFile(
          'apps/backend/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('does not normalize the root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).not.toContain(
          `@${context.space.slug}/${pkg.slug}`,
        );
      });

      it('preserves the original slug in the root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).toContain(pkg.slug);
      });
    });
  });
});
