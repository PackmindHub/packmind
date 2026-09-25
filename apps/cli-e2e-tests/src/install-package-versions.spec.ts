import {
  describeForVersion,
  describeWithUserSignedUp,
  fileExists,
  readFile,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from './helpers';
import { Package, Skill } from '@packmind/types';

/**
 * Which version of a package a repo installs.
 *
 * Every scenario here is the same shape: a package released at one or two
 * versions, a skill added to it *after* the last release, and then the
 * question of whether that skill lands on disk. The skill is the probe —
 * it exists only in the live package, so its presence says "this repo is
 * tracking the package" and its absence says "this repo is on a release".
 */
describeForVersion('>= 0.36.0', 'install at a version', () => {
  describeWithUserSignedUp('install at a version', (getContext) => {
    let context: UserSignedUpContext;
    let pkg: Package;
    let skillAddedAfterTheRelease: Skill;

    const skillFile = () =>
      `.claude/skills/${skillAddedAfterTheRelease.slug}/SKILL.md`;

    const packagesInConfig = (): Record<string, string> =>
      JSON.parse(readFile('packmind.json', context.testDir)).packages;

    const uploadSkill = async (name: string): Promise<Skill> => {
      const response = await context.gateway.skills.upload({
        spaceId: context.space.id,
        files: [
          {
            path: 'SKILL.md',
            content: `---\nname: ${name}\ndescription: A skill used to probe which version is installed\n---\n\nHello world\n`,
            permissions: '0644',
            isBase64: false,
          },
        ],
      });
      return response.skill;
    };

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      // Claude is the only default-configured agent that renders skills, and
      // the skill is what every assertion below reads.
      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {}, agents: ['claude'] }, null, 2),
        context.testDir,
      );

      const firstSkill = await uploadSkill('shipped-in-0-0-1');
      pkg = (
        await context.gateway.packages.create({
          name: 'Ops',
          description: 'Package under version control',
          recipeIds: [],
          standardIds: [],
          skillIds: [firstSkill.id],
          spaceId: context.space.id,
        })
      ).package;

      await context.gateway.packages.createRelease({
        spaceId: context.space.id,
        packageId: pkg.id,
        version: '0.0.1',
      });

      const secondSkill = await uploadSkill('shipped-in-0-1-0');
      await context.gateway.packages.addArtefacts({
        spaceId: context.space.id,
        packageId: pkg.id,
        skillIds: [secondSkill.id],
      });
      await context.gateway.packages.createRelease({
        spaceId: context.space.id,
        packageId: pkg.id,
        version: '0.1.0',
      });

      // The probe: in the package, in no release.
      skillAddedAfterTheRelease = await uploadSkill('optimizing-queries');
      await context.gateway.packages.addArtefacts({
        spaceId: context.space.id,
        packageId: pkg.id,
        skillIds: [skillAddedAfterTheRelease.id],
      });
    });

    describe('when no version is given on the command line', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli(
          `install @${context.space.slug}/${pkg.slug}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('records the latest release in packmind.json', () => {
        expect(packagesInConfig()[`@${context.space.slug}/${pkg.slug}`]).toBe(
          '0.1.0',
        );
      });

      it('does not install what was added after that release', () => {
        expect(fileExists(skillFile(), context.testDir)).toBe(false);
      });
    });

    describe('when an older version is given on the command line', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli(
          `install @${context.space.slug}/${pkg.slug}:0.0.1`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('records that version in packmind.json', () => {
        expect(packagesInConfig()[`@${context.space.slug}/${pkg.slug}`]).toBe(
          '0.0.1',
        );
      });

      it('installs only what that release pinned', () => {
        expect(
          fileExists(
            '.claude/skills/shipped-in-0-1-0/SKILL.md',
            context.testDir,
          ),
        ).toBe(false);
      });
    });

    describe('when the wildcard is given on the command line', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli(
          `install @${context.space.slug}/${pkg.slug}:*`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('records the wildcard in packmind.json', () => {
        expect(packagesInConfig()[`@${context.space.slug}/${pkg.slug}`]).toBe(
          '*',
        );
      });

      it('installs what was added after the last release', () => {
        expect(fileExists(skillFile(), context.testDir)).toBe(true);
      });
    });

    describe('when packmind.json tracks the live package', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        updateFile(
          'packmind.json',
          JSON.stringify(
            {
              packages: { [`@${context.space.slug}/${pkg.slug}`]: '*' },
              agents: ['claude'],
            },
            null,
            2,
          ),
          context.testDir,
        );
        result = await context.runCli('install');
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('installs what was added after the last release', () => {
        expect(fileExists(skillFile(), context.testDir)).toBe(true);
      });
    });

    describe('when packmind.json pins a version', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        updateFile(
          'packmind.json',
          JSON.stringify(
            {
              packages: { [`@${context.space.slug}/${pkg.slug}`]: '0.1.0' },
              agents: ['claude'],
            },
            null,
            2,
          ),
          context.testDir,
        );
        result = await context.runCli('install');
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('does not install what was added after that release', () => {
        expect(fileExists(skillFile(), context.testDir)).toBe(false);
      });

      it('leaves the pinned version in packmind.json', () => {
        expect(packagesInConfig()[`@${context.space.slug}/${pkg.slug}`]).toBe(
          '0.1.0',
        );
      });

      describe('and a newer release is cut afterwards', () => {
        beforeEach(async () => {
          await context.gateway.packages.createRelease({
            spaceId: context.space.id,
            packageId: pkg.id,
            version: '0.2.0',
          });
          result = await context.runCli('install');
        });

        it('succeeds', () => {
          expect(result.returnCode).toBe(0);
        });

        it('stays on the pinned version', () => {
          expect(packagesInConfig()[`@${context.space.slug}/${pkg.slug}`]).toBe(
            '0.1.0',
          );
        });

        it('does not install what the newer release carries', () => {
          expect(fileExists(skillFile(), context.testDir)).toBe(false);
        });
      });
    });

    describe('when the version does not exist', () => {
      describe('and it was given on the command line', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          result = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}:0.9.0`,
          );
        });

        it('fails', () => {
          expect(result.returnCode).toBe(1);
        });

        it('lists the available versions, latest first', () => {
          expect(result.stdout).toContain(
            'Available versions, latest first: 0.1.0, 0.0.1',
          );
        });
      });

      describe('and it was written in packmind.json', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          updateFile(
            'packmind.json',
            JSON.stringify(
              {
                packages: { [`@${context.space.slug}/${pkg.slug}`]: '0.9.0' },
                agents: ['claude'],
              },
              null,
              2,
            ),
            context.testDir,
          );
          result = await context.runCli('install');
        });

        it('fails', () => {
          expect(result.returnCode).toBe(1);
        });

        it('lists the available versions, latest first', () => {
          expect(result.stdout).toContain(
            'Available versions, latest first: 0.1.0, 0.0.1',
          );
        });
      });
    });

    describe('when two config files in one repo pin the same package differently', () => {
      beforeEach(async () => {
        updateFile(
          'packmind.json',
          JSON.stringify(
            {
              packages: { [`@${context.space.slug}/${pkg.slug}`]: '0.0.1' },
              agents: ['claude'],
            },
            null,
            2,
          ),
          context.testDir,
        );
        updateFile(
          'apps/cli/packmind.json',
          JSON.stringify(
            {
              packages: { [`@${context.space.slug}/${pkg.slug}`]: '0.1.0' },
              agents: ['claude'],
            },
            null,
            2,
          ),
          context.testDir,
        );
        await context.runCli('install');
      });

      it('renders the root version at the root', () => {
        expect(
          fileExists(
            '.claude/skills/shipped-in-0-1-0/SKILL.md',
            context.testDir,
          ),
        ).toBe(false);
      });

      it('renders the nested version under the nested config', () => {
        expect(
          fileExists(
            'apps/cli/.claude/skills/shipped-in-0-1-0/SKILL.md',
            context.testDir,
          ),
        ).toBe(true);
      });
    });
  });
});
