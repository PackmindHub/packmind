import {
  describeWithUserSignedUp,
  runCli,
  readFile,
  updateFile,
  setupGitRepo,
  IPackmindGateway,
} from './helpers';
import {
  ChangeProposalType,
  GetTargetsByOrganizationCommand,
  Package,
  Recipe,
  SpaceId,
  TargetWithRepository,
} from '@packmind/types';

describeWithUserSignedUp(
  'targetId is sent when submitting change proposals',
  (getContext) => {
    let gateway: IPackmindGateway;
    let apiKey: string;
    let testDir: string;
    let spaceId: SpaceId;
    let command: Recipe;
    let pkg: Package;
    let rootTarget: TargetWithRepository | undefined;

    beforeEach(async () => {
      const context = await getContext();
      await setupGitRepo(context.testDir);

      apiKey = context.apiKey;
      testDir = context.testDir;
      spaceId = context.spaceId;
      gateway = context.gateway;

      command = await gateway.commands.create({
        name: 'My command',
        content: '# My Command\n\nThis is my command content.',
        spaceId,
      });

      const createPackageResponse = await gateway.packages.create({
        name: 'My package',
        description: 'Test package for targetId verification',
        recipeIds: [command.id],
        standardIds: [],
        spaceId,
      });
      pkg = createPackageResponse.package;

      const installResult = await runCli(`install ${pkg.slug}`, {
        apiKey,
        cwd: testDir,
      });

      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      // Get the root target created by the install
      const targetsCommand: GetTargetsByOrganizationCommand = {
        userId: '',
        organizationId: '',
      };
      const targets =
        await gateway.deployments.getTargetsByOrganization(targetsCommand);
      rootTarget = targets.find((t) => t.path === '/');
    });

    it('creates a root target from install', () => {
      expect(rootTarget).toBeDefined();
    });

    describe('diff --submit', () => {
      let returnCode: number;

      beforeEach(async () => {
        const commandPath = `.packmind/commands/${command.slug}.md`;
        const originalContent = readFile(commandPath, testDir);
        updateFile(
          commandPath,
          `${originalContent}\n\nSome new content here`,
          testDir,
        );

        const result = await runCli('diff --submit -m "My changes"', {
          apiKey,
          cwd: testDir,
        });

        returnCode = result.returnCode;
      });

      it('succeeds', () => {
        expect(returnCode).toEqual(0);
      });

      it('creates change proposals with targetId set', async () => {
        const { changeProposals } =
          await gateway.deployments.listChangeProposalsByRecipe({
            spaceId,
            artefactId: command.id,
          });

        expect(changeProposals).toEqual([
          expect.objectContaining({
            targetId: expect.any(String),
          }),
        ]);
      });
    });

    describe('diff add', () => {
      let returnCode: number;
      let stdout: string;
      let stderr: string;

      beforeEach(async () => {
        updateFile(
          '.packmind/standards/my-new-standard.md',
          '# My new standard\n\nA new standard description.\n\n## Rules \n\n* Rule 1\n* Rule 2',
          testDir,
        );

        const result = await runCli(
          'diff add .packmind/standards/my-new-standard.md -m "Add new standard"',
          {
            apiKey,
            cwd: testDir,
          },
        );

        returnCode = result.returnCode;
        stdout = result.stdout;
        stderr = result.stderr;
      });

      it('succeeds', () => {
        if (returnCode !== 0) {
          console.log('stderr:', stderr);
          console.log('stdout:', stdout);
        }
        expect(returnCode).toEqual(0);
      });

      it('submits 1 change proposal', () => {
        expect(stdout).toContain('Summary: 1 submitted');
      });
    });

    describe('diff remove', () => {
      let returnCode: number;
      let stdout: string;
      let stderr: string;

      beforeEach(async () => {
        const result = await runCli(
          `diff remove .packmind/commands/${command.slug}.md -m "Remove command from project"`,
          {
            apiKey,
            cwd: testDir,
          },
        );

        returnCode = result.returnCode;
        stdout = result.stdout;
        stderr = result.stderr;
      });

      it('succeeds', () => {
        if (returnCode !== 0) {
          console.log('stderr:', stderr);
          console.log('stdout:', stdout);
        }
        expect(returnCode).toEqual(0);
      });

      it('creates a change proposal with targetId set', async () => {
        const { changeProposals } =
          await gateway.deployments.listChangeProposalsByRecipe({
            spaceId,
            artefactId: command.id,
          });

        expect(changeProposals).toEqual([
          expect.objectContaining({
            type: ChangeProposalType.removeCommand,
            artefactId: command.id,
            targetId: rootTarget?.id,
          }),
        ]);
      });
    });
  },
);
