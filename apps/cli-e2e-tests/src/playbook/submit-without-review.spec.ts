import {
  describeWithUserSignedUp,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import fs from 'fs';

describeWithUserSignedUp('playbook submit --no-review', (getContext) => {
  let context: UserSignedUpContext;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);

    updateFile(
      'packmind.json',
      JSON.stringify({ packages: {} }),
      context.testDir,
    );
  });

  describe('when creating new artefacts using `playbook add`command', () => {
    let playbookSubmitResult: RunCliResult;

    beforeEach(async () => {
      fs.mkdirSync(`${context.testDir}/.packmind/standards/`, {
        recursive: true,
      });
      updateFile(
        `.packmind/standards/my-standard.md`,
        `# My new standard
        
With a description:

* rule 1
* rule 2
`,
        context.testDir,
      );

      await context.runCli(`playbook add .packmind/standards/my-standard.md`);
      playbookSubmitResult = await context.runCli(
        `playbook submit --no-review`,
      );
    });

    it('succeeds', () => {
      expect(playbookSubmitResult).toEqual({
        returnCode: 0,
        stderr: '',
        stdout: expect.stringMatching('1 standard created'),
      });
    });

    it('creates the new artefact', async () => {
      const standards = await context.gateway.standards.list({
        spaceId: context.space.id,
      });

      expect(standards).toEqual({
        standards: [
          expect.objectContaining({
            name: 'My new standard',
          }),
        ],
      });
    });
  });
});
