import { expect } from '@playwright/test';
import { testWithApi } from '../../fixtures/packmindTest';

testWithApi.describe('Manage space identity', () => {
  testWithApi(
    'space admin updates name and color, sees it reflected in the sidebar',
    async ({ dashboardPage }) => {
      // Create a new space
      const spaceDashboard = await dashboardPage.createSpace('oddity');

      // Open space settings
      const spaceSettingsPage = await spaceDashboard.openSpaceSettings();

      // Update the name
      await spaceSettingsPage.setSpaceName('security');

      // Select a new color
      await spaceSettingsPage.selectColor('purple');

      // Save changes
      await spaceSettingsPage.clickSaveIdentity();
      await spaceSettingsPage.waitForIdentityUpdateSuccess();

      // Navigate to dashboard and verify the sidebar shows the new name
      const updatedDashboard = await spaceSettingsPage.navigateToDashboard();
      await updatedDashboard.navigateToSpace('security');
    },
  );

  testWithApi(
    'space admin cannot rename to a slug-colliding name',
    async ({ dashboardPage }) => {
      // Create two spaces
      await dashboardPage.createSpace('security');
      const dashboard = await dashboardPage.navigateToDashboard();
      const spaceDashboard = await dashboard.createSpace(
        'security-connections',
      );

      // Open space settings for the second space
      const spaceSettingsPage = await spaceDashboard.openSpaceSettings();

      // Try to rename to a name whose slug collides with the first space
      await spaceSettingsPage.setSpaceName('Security');

      // Save changes
      await spaceSettingsPage.clickSaveIdentity();

      // Expect error
      const errorText = await spaceSettingsPage.waitForIdentityUpdateError();
      expect(errorText).toContain('similar name already exists');
    },
  );

  testWithApi(
    'default space name input is disabled but color can be changed',
    async ({ dashboardPage }) => {
      // Navigate to default space settings
      const spaceSettingsPage = await dashboardPage.openSpaceSettings();

      // Verify name input is disabled
      const isNameDisabled = await spaceSettingsPage.isSpaceNameDisabled();
      expect(isNameDisabled).toBe(true);

      // Select a new color
      await spaceSettingsPage.selectColor('purple');

      // Save changes (only color)
      await spaceSettingsPage.clickSaveIdentity();
      await spaceSettingsPage.waitForIdentityUpdateSuccess();
    },
  );
});
