import path from 'path';
import { expect } from '@playwright/test';

import { testWithUserSignedUp } from '../../fixtures/packmindTest';

/** A folder holding two skill directories, one of them with a nested file. */
const SKILLS_FIXTURE_FOLDER = path.join(__dirname, '../../fixtures/skills');

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
