import { v4 as uuidv4 } from 'uuid';
import { expect } from '@playwright/test';
import { testWithApi } from '../../fixtures/packmindTest';

const test = testWithApi.extend<{
  userData: { email: string; password: string };
}>({
  // eslint-disable-next-line no-empty-pattern
  userData: ({}, use) => {
    use({
      email: `e2e-${uuidv4()}@packmind.com`,
      password: `${uuidv4()}!!`,
    });
  },
});

test.describe('Manage space identity', () => {
  test('space admin updates name and color, sees it reflected in the sidebar', async ({
    dashboardPage,
  }) => {
    // Create a new space and navigate into it
    await dashboardPage.createSpace('oddity');
    const dashboard = await dashboardPage.navigateToDashboard();
    const oddityDashboard = await dashboard.navigateToSpace('oddity');

    // Open space settings
    const spaceSettingsPage = await oddityDashboard.openSpaceSettings();

    // Update the name
    await spaceSettingsPage.setSpaceName('security');

    // Select a new color
    await spaceSettingsPage.selectColor('purple');

    // Save changes
    await spaceSettingsPage.clickSaveIdentity();
    await spaceSettingsPage.waitForIdentityUpdateSuccess();

    // Navigate to dashboard and verify the sidebar shows the new name
    await spaceSettingsPage.navigateToDashboard();
  });

  test('space admin cannot rename to a slug-colliding name', async ({
    dashboardPage,
  }) => {
    // Create two spaces
    await dashboardPage.createSpace('security');
    let dashboard = await dashboardPage.navigateToDashboard();
    await dashboard.createSpace('security-connections');
    dashboard = await dashboard.navigateToDashboard();
    const scDashboard = await dashboard.navigateToSpace('security-connections');

    // Open space settings for the second space
    const spaceSettingsPage = await scDashboard.openSpaceSettings();

    // Try to rename to a name whose slug collides with the first space
    await spaceSettingsPage.setSpaceName('Security');

    // Save changes
    await spaceSettingsPage.clickSaveIdentity();

    // Expect error
    const errorText = await spaceSettingsPage.waitForIdentityUpdateError();
    expect(errorText).toContain('similar name already exists');
  });

  test('default space name input is disabled but color can be changed', async ({
    dashboardPage,
  }) => {
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
  });
});
