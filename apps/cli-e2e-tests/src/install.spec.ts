import {
  describeWithUserSignedUp,
  runCli,
  setupGitRepo,
  IPackmindGateway,
  RunCliResult,
  readFile,
} from './helpers';
import { Package, Space } from '@packmind/types';
import { before } from 'node:test';

describeWithUserSignedUp('diff command', (getContext) => {
  let gateway: IPackmindGateway;
  let apiKey: string;
  let testDir: string;
  let space: Space;
  let pkg: Package;

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
    let installResult: RunCliResult;

    describe('when user does not specify the space slug', () => {
      before(async () => {
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
      before(async () => {
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
});
