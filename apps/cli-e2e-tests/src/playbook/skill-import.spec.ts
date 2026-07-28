import fs from 'fs';

import {
  describeForVersion,
  describeWithUserSignedUp,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';

function writeSkill(testDir: string, name: string): void {
  fs.mkdirSync(`${testDir}/.claude/skills/${name}`, { recursive: true });
  updateFile(
    `.claude/skills/${name}/SKILL.md`,
    `---
name: ${name}
description: A skill used by the import end-to-end test.
---

# ${name}

Do the thing.
`,
    testDir,
  );
}

describeForVersion('>= 0.31.0', 'importing several skills at once', () => {
  describeWithUserSignedUp('importing several skills at once', (getContext) => {
    let context: UserSignedUpContext;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {} }),
        context.testDir,
      );

      writeSkill(context.testDir, 'my-first-skill');
      writeSkill(context.testDir, 'my-second-skill');
    });

    describe('when both skill directories are staged in one add', () => {
      let submitResult: RunCliResult;

      beforeEach(async () => {
        await context.runCli(
          'playbook add .claude/skills/my-first-skill .claude/skills/my-second-skill',
        );
        submitResult = await context.runCli('playbook submit --no-review');
      });

      it('submits successfully', () => {
        expect(submitResult.returnCode).toBe(0);
      });

      it('creates both skills in the space', async () => {
        const skills = await context.gateway.skills.list({
          spaceId: context.space.id,
        });

        expect(skills.map((skill) => skill.name).sort()).toEqual([
          'my-first-skill',
          'my-second-skill',
        ]);
      });
    });

    describe('when one of the staged paths does not exist', () => {
      let addResult: RunCliResult;

      beforeEach(async () => {
        addResult = await context.runCli(
          'playbook add .claude/skills/my-first-skill .claude/skills/does-not-exist',
        );
      });

      it('exits with a failure', () => {
        expect(addResult.returnCode).toBe(1);
      });

      it('names the path that failed on stderr', () => {
        expect(addResult.stderr).toContain('does-not-exist');
      });

      it('reports how much of the batch was staged', () => {
        expect(addResult.stdout).toContain('1 staged, 1 failed of 2');
      });

      it('still creates the skill whose path was valid', async () => {
        await context.runCli('playbook submit --no-review');
        const skills = await context.gateway.skills.list({
          spaceId: context.space.id,
        });

        expect(skills.map((skill) => skill.name)).toEqual(['my-first-skill']);
      });
    });
  });
});
