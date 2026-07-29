import path from 'path';
import { expect } from '@playwright/test';

import { testWithUserSignedUp } from '../../fixtures/packmindTest';

const fixture = (name: string) => path.join(__dirname, '../../fixtures', name);

/** A folder holding two skill directories, one of them with a nested file. */
const SKILLS_FIXTURE_FOLDER = fixture('skills');
/** Two folders whose SKILL.md files both declare `name: shared-skill`. */
const SAME_DECLARED_NAME_FOLDER = fixture('skills-same-declared-name');
/** A folder named `folder-alpha` whose SKILL.md declares `name: declared-beta`. */
const RENAMED_FOLDER = fixture('skills-renamed-folder');

testWithUserSignedUp.describe('importing skills from the web dialog', () => {
  testWithUserSignedUp(
    'it imports two valid skills from one folder',
    async ({ dashboardPage }) => {
      testWithUserSignedUp.setTimeout(90_000);

      const skillsPage = await dashboardPage.openSkills();
      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(SKILLS_FIXTURE_FOLDER);

      const detected = await skillsPage.listDetectedSkills();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(detected).toEqual([
        expect.stringContaining('documentation'),
        expect.stringContaining('onboarding'),
      ]);

      const summary = await skillsPage.importDetectedSkills();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(summary).toContain('2 imported, 0 failed');

      // Importing again would upload every skill a second time and add a version
      // to each, so the action has to be spent once the batch has settled.
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await skillsPage.canImportDetectedSkills()).toBe(false);

      await skillsPage.closeImportDialog();
      const skills = await skillsPage.listSkills();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(skills.map((skill) => skill.name).sort()).toEqual([
        'documentation',
        'onboarding',
      ]);
    },
  );

  /**
   * The endpoint resolves a skill by the name in its SKILL.md frontmatter, so
   * importing two folders that declare the same name would create one skill,
   * silently overwrite it with the second, and report two successes.
   */
  testWithUserSignedUp(
    'it refuses both folders when they declare the same skill name',
    async ({ dashboardPage }) => {
      testWithUserSignedUp.setTimeout(90_000);

      const skillsPage = await dashboardPage.openSkills();
      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(SAME_DECLARED_NAME_FOLDER);

      const detected = await skillsPage.listDetectedSkills();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(detected).toEqual([
        expect.stringContaining('More than one selected folder declares'),
        expect.stringContaining('More than one selected folder declares'),
      ]);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await skillsPage.canImportDetectedSkills()).toBe(false);
    },
  );

  /**
   * A folder whose name differs from the name it declares must still be checked
   * against the space by the declared name, or the conflict check is bypassed
   * and the re-import silently updates an unrelated skill.
   */
  testWithUserSignedUp(
    'it identifies a skill by its declared name, not its folder',
    async ({ dashboardPage }) => {
      testWithUserSignedUp.setTimeout(90_000);

      const skillsPage = await dashboardPage.openSkills();
      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(RENAMED_FOLDER);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await skillsPage.listDetectedSkills()).toEqual([
        expect.stringContaining('declared-beta'),
      ]);

      await skillsPage.importDetectedSkills();
      await skillsPage.closeImportDialog();
      await skillsPage.reload();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect((await skillsPage.listSkills()).map((s) => s.name)).toEqual([
        'declared-beta',
      ]);

      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(RENAMED_FOLDER);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await skillsPage.listDetectedSkills()).toEqual([
        expect.stringContaining('already exists'),
      ]);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await skillsPage.canImportDetectedSkills()).toBe(false);
    },
  );

  testWithUserSignedUp(
    'it reports a skill whose name is already taken instead of importing it',
    async ({ dashboardPage }) => {
      testWithUserSignedUp.setTimeout(90_000);

      const skillsPage = await dashboardPage.openSkills();

      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(SKILLS_FIXTURE_FOLDER);
      await skillsPage.importDetectedSkills();
      await skillsPage.closeImportDialog();
      // Reload rather than rely on the list refreshing, so the second attempt
      // starts from a state where the two skills are known to exist.
      await skillsPage.reload();

      await skillsPage.openImportDialog();
      await skillsPage.chooseSkillsFolder(SKILLS_FIXTURE_FOLDER);
      const detected = await skillsPage.listDetectedSkills();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(detected.join('\n')).toContain('already exists');
    },
  );
});
