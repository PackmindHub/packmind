import {
  describeWithUserSignedUp,
  readFile,
  updateFile,
  setupGitRepo,
  UserSignedUpContext,
} from '../helpers';
import { Recipe, Space, Standard } from '@packmind/types';
import { recipeFactory } from '@packmind/recipes/test';

describeWithUserSignedUp('playbook add --space command', (getContext) => {
  let context: UserSignedUpContext;
  let space1: Space;
  let space2: Space;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);

    space1 = await context.gateway.spaces.create({ name: 'Space One' });
    space2 = await context.gateway.spaces.create({ name: 'Space Two' });
  });

  describe('when staging a new standard with --space for each space', () => {
    let standardPathInSpace1: string;
    let standardPathInSpace2: string;

    beforeEach(async () => {
      const bootstrapStandard = (await context.gateway.standards.create({
        name: 'Bootstrap standard',
        description: 'Used to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: space1.id,
      })) as unknown as Standard;

      const createPackageResponse = await context.gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package for project setup',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${createPackageResponse.package.slug}`,
      );

      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      standardPathInSpace1 = '.packmind/standards/space-one-standard.md';
      updateFile(
        standardPathInSpace1,
        '# Space One Standard\n\nBest practices for space one.',
        context.testDir,
      );

      standardPathInSpace2 = '.packmind/standards/space-two-standard.md';
      updateFile(
        standardPathInSpace2,
        '# Space Two Standard\n\nBest practices for space two.',
        context.testDir,
      );
    });

    describe('when adding a standard to space1', () => {
      let addResult: { returnCode: number; stdout: string; stderr: string };

      beforeEach(async () => {
        addResult = await context.runCli(
          `playbook add --space ${space1.slug} ${standardPathInSpace1}`,
        );
      });

      it('succeeds', () => {
        expect(addResult.returnCode).toBe(0);
      });

      it('shows the standard staged in space1', () => {
        expect(addResult.stdout).toContain(`in space "${space1.name}"`);
      });

      it('shows the correct space in playbook status', async () => {
        const statusResult = await context.runCli('playbook status');

        expect(statusResult.stdout).toMatchOutput(
          `Standard "Space One Standard" (created) in space "${space1.name}"`,
        );
      });
    });

    describe('when adding a standard to space2', () => {
      let addResult: { returnCode: number; stdout: string; stderr: string };

      beforeEach(async () => {
        addResult = await context.runCli(
          `playbook add --space ${space2.slug} ${standardPathInSpace2}`,
        );
      });

      it('succeeds', () => {
        expect(addResult.returnCode).toBe(0);
      });

      it('shows the standard staged in space2', () => {
        expect(addResult.stdout).toContain(`in space "${space2.name}"`);
      });

      it('shows the correct space in playbook status', async () => {
        const statusResult = await context.runCli('playbook status');

        expect(statusResult.stdout).toMatchOutput(
          `Standard "Space Two Standard" (created) in space "${space2.name}"`,
        );
      });
    });

    describe('when adding standards to both spaces', () => {
      beforeEach(async () => {
        const addResult1 = await context.runCli(
          `playbook add --space ${space1.slug} ${standardPathInSpace1}`,
        );
        if (addResult1.returnCode !== 0) {
          throw new Error(
            `Failed to add to space1: ${addResult1.stderr || addResult1.stdout}`,
          );
        }

        const addResult2 = await context.runCli(
          `playbook add --space ${space2.slug} ${standardPathInSpace2}`,
        );
        if (addResult2.returnCode !== 0) {
          throw new Error(
            `Failed to add to space2: ${addResult2.stderr || addResult2.stdout}`,
          );
        }
      });

      it('shows both standards in playbook status with their respective spaces', async () => {
        const statusResult = await context.runCli('playbook status');

        expect(statusResult.stdout).toMatchOutput(
          `Standard "Space One Standard" (created) in space "${space1.name}"`,
        );
        expect(statusResult.stdout).toMatchOutput(
          `Standard "Space Two Standard" (created) in space "${space2.name}"`,
        );
      });
    });

    describe('when adding without --space and multiple spaces exist', () => {
      it('fails and asks user to specify a space', async () => {
        const addResult = await context.runCli(
          `playbook add ${standardPathInSpace1}`,
        );
        const output = addResult.stdout || addResult.stderr;

        expect(addResult.returnCode).toBe(1);
        expect(output).toContain('--space');
      });
    });
  });

  describe('when staging a command with --space', () => {
    let command: Recipe;
    let commandPath: string;

    beforeEach(async () => {
      command = await context.gateway.commands.create(
        recipeFactory({
          spaceId: space1.id,
          name: 'My command',
          slug: 'my-command',
        }),
      );

      const { package: pkg } = await context.gateway.packages.create({
        name: 'Command package',
        description: 'Package with a command',
        recipeIds: [command.id],
        standardIds: [],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${pkg.slug}`,
      );
      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      commandPath = `.packmind/commands/${command.slug}.md`;
      const originalContent = readFile(commandPath, context.testDir);
      updateFile(
        commandPath,
        `${originalContent}\n* Never use var`,
        context.testDir,
      );
    });

    describe('when adding the command with --space', () => {
      let addResult: { returnCode: number; stdout: string; stderr: string };

      beforeEach(async () => {
        addResult = await context.runCli(
          `playbook add --space ${space1.slug} ${commandPath}`,
        );
      });

      it('succeeds', () => {
        expect(addResult.returnCode).toBe(0);
      });

      it('shows the command as updated', () => {
        expect(addResult.stdout).toContain('updated');
      });

      it('shows the command in playbook status', async () => {
        const statusResult = await context.runCli('playbook status');

        expect(statusResult.stdout).toContain(
          `Command "${command.name}" (updated)`,
        );
      });
    });
  });

  describe('when updating a deployed standard with --space', () => {
    let standard: Standard;
    let standardPath: string;

    beforeEach(async () => {
      standard = (await context.gateway.standards.create({
        name: 'Deployed standard',
        description: 'A standard to be updated.',
        rules: [{ content: 'Always use const' }],
        scope: null,
        spaceId: space1.id,
      })) as unknown as Standard;

      const { package: pkg } = await context.gateway.packages.create({
        name: 'Standard package',
        description: 'Package with a standard',
        recipeIds: [],
        standardIds: [standard.id],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${pkg.slug}`,
      );
      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      const { execSync } = await import('child_process');
      const files = execSync(
        `find ${context.testDir} -name "*.md" -not -path "*/.git/*"`,
      )
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean);

      const standardFile = files.find((f) => f.includes(standard.slug));
      if (!standardFile) {
        throw new Error(
          `Standard file not found after install. Files: ${files.join(', ')}`,
        );
      }
      standardPath = standardFile.replace(`${context.testDir}/`, '');

      const originalContent = readFile(standardPath, context.testDir);
      updateFile(
        standardPath,
        `${originalContent}\n* Never use var`,
        context.testDir,
      );
    });

    describe('when adding the updated standard', () => {
      let addResult: { returnCode: number; stdout: string; stderr: string };

      beforeEach(async () => {
        addResult = await context.runCli(
          `playbook add --space ${space1.slug} ${standardPath}`,
        );
      });

      it('succeeds', () => {
        expect(addResult.returnCode).toBe(0);
      });

      it('shows the standard as updated', () => {
        expect(addResult.stdout).toContain('updated');
      });

      it('shows the standard in playbook status as updated', async () => {
        const statusResult = await context.runCli('playbook status');

        expect(statusResult.stdout).toContain(
          `Standard "${standard.name}" (updated)`,
        );
      });
    });
  });

  describe('when using a non-existent space slug', () => {
    beforeEach(async () => {
      const bootstrapStandard = (await context.gateway.standards.create({
        name: 'Bootstrap standard',
        description: 'Used to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: space1.id,
      })) as unknown as Standard;

      const { package: pkg } = await context.gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${pkg.slug}`,
      );
      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      updateFile(
        '.packmind/standards/some-standard.md',
        '# Some Standard\n\nContent.',
        context.testDir,
      );
    });

    it('fails with an error mentioning the unknown slug', async () => {
      const addResult = await context.runCli(
        'playbook add --space non-existent-space .packmind/standards/some-standard.md',
      );
      const output = addResult.stdout || addResult.stderr;

      expect(addResult.returnCode).toBe(1);
      expect(output).toContain('"non-existent-space" not found');
    });

    it('lists available spaces in the error', async () => {
      const addResult = await context.runCli(
        'playbook add --space non-existent-space .packmind/standards/some-standard.md',
      );
      const output = addResult.stdout || addResult.stderr;

      expect(output).toContain(space1.slug);
      expect(output).toContain(space2.slug);
    });
  });

  describe('when adding the same artifact to different spaces', () => {
    let standardPath: string;

    beforeEach(async () => {
      const bootstrapStandard = (await context.gateway.standards.create({
        name: 'Bootstrap standard',
        description: 'Used to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: space1.id,
      })) as unknown as Standard;

      const { package: pkg } = await context.gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${pkg.slug}`,
      );
      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      standardPath = '.packmind/standards/shared-standard.md';
      updateFile(
        standardPath,
        '# Shared Standard\n\nShared across spaces.',
        context.testDir,
      );
    });

    it('can stage the same artifact to space1 then to space2', async () => {
      const addResult1 = await context.runCli(
        `playbook add --space ${space1.slug} ${standardPath}`,
      );
      expect(addResult1.returnCode).toBe(0);
      expect(addResult1.stdout).toContain(`in space "${space1.name}"`);

      const addResult2 = await context.runCli(
        `playbook add --space ${space2.slug} ${standardPath}`,
      );
      expect(addResult2.returnCode).toBe(0);
      expect(addResult2.stdout).toContain(`in space "${space2.name}"`);

      const statusResult = await context.runCli('playbook status');
      expect(statusResult.stdout).toContain('Shared Standard');
    });
  });

  describe('when submitting after adding with --space', () => {
    beforeEach(async () => {
      const bootstrapStandard = (await context.gateway.standards.create({
        name: 'Bootstrap standard',
        description: 'Used to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: space1.id,
      })) as unknown as Standard;

      const { package: pkg } = await context.gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: space1.id,
      });

      const installResult = await context.runCli(
        `install @${space1.slug}/${pkg.slug}`,
      );
      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }
    });

    it('creates a proposal in the correct space after adding to space1', async () => {
      updateFile(
        '.packmind/standards/submitted-standard.md',
        '# Submitted Standard\n\nWill be submitted to space1.',
        context.testDir,
      );

      const addResult = await context.runCli(
        `playbook add --space ${space1.slug} .packmind/standards/submitted-standard.md`,
      );
      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add: ${addResult.stderr || addResult.stdout}`,
        );
      }

      await context.runCli('playbook submit -m "Submit to space1"');

      const proposals = await context.gateway.changeProposals.listBySpace({
        spaceId: space1.id,
      });

      expect(proposals.creations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Submitted Standard' }),
        ]),
      );
    });

    it('creates a proposal in space2, not space1, after adding to space2', async () => {
      updateFile(
        '.packmind/standards/submitted-to-space2.md',
        '# Space Two Submission\n\nWill be submitted to space2.',
        context.testDir,
      );

      const addResult = await context.runCli(
        `playbook add --space ${space2.slug} .packmind/standards/submitted-to-space2.md`,
      );
      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add: ${addResult.stderr || addResult.stdout}`,
        );
      }

      await context.runCli('playbook submit -m "Submit to space2"');

      const space2Proposals = await context.gateway.changeProposals.listBySpace(
        {
          spaceId: space2.id,
        },
      );

      expect(space2Proposals.creations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Space Two Submission' }),
        ]),
      );

      const space1Proposals = await context.gateway.changeProposals.listBySpace(
        {
          spaceId: space1.id,
        },
      );

      const space1HasIt = space1Proposals.creations.some(
        (c) => c.name === 'Space Two Submission',
      );
      expect(space1HasIt).toBe(false);
    });
  });
});
