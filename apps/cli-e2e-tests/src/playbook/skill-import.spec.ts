import fs from 'fs';

import {
  describeForVersion,
  describeWithUserSignedUp,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';

/** `declaredName` defaults to the folder name; pass it to make two folders clash. */
function writeSkill(
  testDir: string,
  folder: string,
  declaredName = folder,
): void {
  fs.mkdirSync(`${testDir}/.claude/skills/${folder}`, { recursive: true });
  updateFile(
    `.claude/skills/${folder}/SKILL.md`,
    `---
name: ${declaredName}
description: A skill used by the import end-to-end test.
---

# ${declaredName}

Do the thing.
`,
    testDir,
  );
}

// Multi-path `playbook add` and per-artifact `playbook submit` landed after
// 0.32.0; gate so production-CLI CI skips older CLI versions that do not
// implement the new behaviour.
describeForVersion('> 0.32.0', 'importing several skills at once', () => {
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

    /**
     * Two folders declaring the same skill name in their frontmatter. This is the
     * conflict a batch can actually hit: an artifact that already exists in the
     * space is not one, because `playbook add` resolves it remotely and adopts it
     * as an update before it is ever staged as a creation.
     */
    describe('when two staged skills declare the same name', () => {
      let submitResult: RunCliResult;

      beforeEach(async () => {
        writeSkill(context.testDir, 'copy-a', 'shared-skill');
        writeSkill(context.testDir, 'copy-b', 'shared-skill');

        await context.runCli(
          'playbook add .claude/skills/copy-a .claude/skills/copy-b .claude/skills/my-first-skill',
        );
        submitResult = await context.runCli('playbook submit --no-review');
      });

      it('exits with a failure', () => {
        expect(submitResult.returnCode).toBe(1);
      });

      it('reports the duplicate', () => {
        expect(submitResult.stderr).toContain('staged multiple times');
      });

      it('says the skipped change is still staged', () => {
        expect(submitResult.stdout).toContain('remain');
      });

      it('still creates the skill that did not conflict', async () => {
        const skills = await context.gateway.skills.list({
          spaceId: context.space.id,
        });

        expect(skills.map((skill) => skill.name)).toEqual(['my-first-skill']);
      });

      it('holds back both sides of the duplicate rather than picking one', async () => {
        const status = await context.runCli('playbook status');

        expect([
          status.stdout.includes('copy-a'),
          status.stdout.includes('copy-b'),
        ]).toEqual([true, true]);
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
