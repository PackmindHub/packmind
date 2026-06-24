import { v4 as uuidv4 } from 'uuid';
import { expect } from '@playwright/test';
import { SpaceType } from '@packmind/types';
import { standardFactory } from '@packmind/standards/test';
import { testWithApi } from '../../fixtures/packmindTest';
import { PageFactory } from '../../infra/PageFactory';
import assert from 'node:assert';

const test = testWithApi.extend<{
  userData: { email: string; password: string };
}>({
  // eslint-disable-next-line no-empty-pattern
  userData: ({}, use) => {
    use({
      email: `e2e-${uuidv4()}@packmind.com`,
      password: `${uuidv4()}!!`,
      method: 'password',
    });
  },
});

test.describe('Private space access', () => {
  test('non-member is redirected away from a private space', async ({
    dashboardPage,
    packmindApi,
    page,
  }) => {
    const privateSpaceName = `private-${uuidv4().slice(0, 8)}`;

    // Alice creates a private space
    const privateDashboard = await dashboardPage.createSpace(privateSpaceName, {
      type: SpaceType.private,
    });

    // Capture the private space URL while Alice has access
    const privateSpaceUrl = page.url();

    // Create a standard inside the private space via API
    const { spaces } = await packmindApi.listSpaces({});
    const privateSpace = spaces.find((s) => s.name === privateSpaceName);
    assert(privateSpace, 'Private space not found');

    const standardData = standardFactory({
      spaceId: privateSpace.id,
      name: `Secret standard ${uuidv4().slice(0, 8)}`,
    });
    await packmindApi.createStandard({
      spaceId: privateSpace.id,
      name: standardData.name,
      description: standardData.description,
      scope: standardData.scope,
      rules: [],
    });

    // Alice invites Bob to the organization
    const bobEmail = `bob-${uuidv4().slice(0, 8)}@packmind.com`;
    const bobPassword = `${uuidv4()}!!`;

    const settingsPage = await privateDashboard.openSettings();
    const usersSettingsPage = await settingsPage.openUsersSettings();
    await usersSettingsPage.inviteUser(bobEmail);
    const invitationToken = await usersSettingsPage.getInvitationToken();

    // Alice signs out
    await usersSettingsPage.signOut();

    // Bob activates his account
    const pageFactory = new PageFactory(page);
    const invitationPage = await pageFactory.getInvitationPage(invitationToken);
    const bobDashboard = await invitationPage.activateAccount(bobPassword);
    await bobDashboard.expectWelcomeMessage();

    // Bob navigates directly to the private space URL
    await page.goto(privateSpaceUrl);

    // Bob is redirected away from the private space
    await expect(page).not.toHaveURL(new RegExp(privateSpaceName));
  });
});
