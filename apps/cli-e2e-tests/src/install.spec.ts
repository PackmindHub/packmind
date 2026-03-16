import {
  describeWithUserSignedUp,
  runCli,
  setupGitRepo,
  IPackmindGateway,
  RunCliResult,
  readFile,
  updateFile,
} from './helpers';
import { Package, Space } from '@packmind/types';

describeWithUserSignedUp('diff command', (getContext) => {
  let gateway: IPackmindGateway;
  let apiKey: string;
  let testDir: string;
  let space: Space;
  let pkg: Package;
  let installResult: RunCliResult;

  beforeEach(async () => {
    const context = await getContext();
    await setupGitRepo(context.testDir);

    apiKey = context.apiKey;
    testDir = context.testDir;
    space = context.space;
    gateway = context.gateway;

    // Create a package with both commands
    const createPackageResponse = await gateway.packages.create({
      name: 'My package',
      description: 'Test package for diff command',
      recipeIds: [],
      standardIds: [],
      spaceId: space.id,
    });
    pkg = createPackageResponse.package;
  });

  describe('when user specifies the packages to install in the command line', () => {
    describe('when user does not specify the space slug', () => {
      beforeEach(async () => {
        installResult = await runCli(`install ${pkg.slug}`, {
          apiKey,
          cwd: testDir,
        });
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('references the space slug in the packmind.json file', () => {
        const packmindJson = readFile('packmind.json', testDir);

        expect(packmindJson).toContain(`@${space.slug}/${pkg.slug}`);
      });
    });

    describe('when user specifies the space slug', () => {
      beforeEach(async () => {
        installResult = await runCli(`install @${space.slug}/${pkg.slug}`, {
          apiKey,
          cwd: testDir,
        });
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('references the space slug in the packmind.json file', () => {
        const packmindJson = readFile('packmind.json', testDir);

        expect(packmindJson).toContain(`@${space.slug}/${pkg.slug}`);
      });
    });
  });

  describe('when content to install is read from packmind.json', () => {
    describe('when packages are not prefixed by space slug', () => {
      beforeEach(async () => {
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          testDir,
        );

        installResult = await runCli(`install`, {
          apiKey,
          cwd: testDir,
        });
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('updates the packmind.json file with a prefixed label of the package', () => {
        const packmindJson = readFile('packmind.json', testDir);

        expect(packmindJson).toContain(`@${space.slug}/${pkg.slug}`);
      });
    });
  });
});
