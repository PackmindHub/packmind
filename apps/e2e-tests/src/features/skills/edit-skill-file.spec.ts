import { Skill, SkillVersion } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiSkillFactory } from '../../domain/apiDataFactories/apiSkillFactory';
import { expect } from '@playwright/test';

testWithApi.describe('editing a skill file', () => {
  let skill: Skill;

  testWithApi.beforeEach(async ({ packmindApi, dashboardPage }) => {
    testWithApi.setTimeout(60_000);

    skill = await apiSkillFactory(packmindApi);
    await dashboardPage.reload();
  });

  testWithApi(
    'it displays the updated content and creates a new version after saving an edit',
    async ({ dashboardPage, packmindApi }) => {
      const skillsPage = await dashboardPage.openSkills();
      const skillFilePage = await skillsPage.openSkill(skill.name);

      const updatedContent = 'This is the updated skill prompt content.';

      await skillFilePage.clickEdit();
      await skillFilePage.replaceEditorContent(updatedContent);
      await skillFilePage.clickSave();

      const displayedContent = await skillFilePage.readDisplayedContent();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(displayedContent).toContain(updatedContent);

      const displayedVersion = await skillFilePage.getVersionNumber();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(displayedVersion).toBe(2);

      const { versions } = await packmindApi.listSkillVersions({
        skillId: skill.id,
        spaceId: skill.spaceId,
      });

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(versions.map((version: SkillVersion) => version.version)).toEqual([
        2, 1,
      ]);
    },
  );

  testWithApi(
    'it rejects an empty save and keeps the editor open with no new version',
    async ({ dashboardPage, packmindApi }) => {
      const skillsPage = await dashboardPage.openSkills();
      const skillFilePage = await skillsPage.openSkill(skill.name);

      await skillFilePage.clickEdit();
      await skillFilePage.replaceEditorContent('');
      const errorMessage = await skillFilePage.clickSaveExpectingError();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(errorMessage).toContain('cannot be empty');

      const stillEditable = await skillFilePage.isEditorEditable();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(stillEditable).toBe(true);

      const { versions } = await packmindApi.listSkillVersions({
        skillId: skill.id,
        spaceId: skill.spaceId,
      });

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(versions.map((version: SkillVersion) => version.version)).toEqual([
        1,
      ]);
    },
  );
});
