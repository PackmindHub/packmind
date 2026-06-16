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
      method: 'password',
    });
  },
});

test.describe('Add members to a space', () => {
  test('organization member can be added to a new space', async ({
    dashboardPage,
  }) => {
    const invitedEmail = `invited-${uuidv4().slice(0, 8)}@packmind.com`;
    const invitedDisplayName = invitedEmail.split('@')[0];

    // Invite a new user to the organization
    const settingsPage = await dashboardPage.openSettings();
    const usersSettingsPage = await settingsPage.openUsersSettings();
    await usersSettingsPage.inviteUser(invitedEmail);

    // Navigate back to dashboard before creating a space
    const defaultDashboard = await usersSettingsPage.navigateToDashboard();

    // Create a new space
    const spaceDashboard = await defaultDashboard.createSpace('team-space');

    // Open space settings and go to Members tab
    const spaceSettingsPage = await spaceDashboard.openSpaceSettings();
    await spaceSettingsPage.openMembersTab();

    // Reload to clear TanStack Query cache after invitation
    await spaceSettingsPage.reload();
    await spaceSettingsPage.openMembersTab();

    // Add the invited user to the space
    await spaceSettingsPage.clickAddMembers();
    await spaceSettingsPage.searchAndSelectMember(invitedDisplayName);
    await spaceSettingsPage.submitAddMembers();

    // Reload to clear TanStack Query cache
    await spaceSettingsPage.reload();
    await spaceSettingsPage.openMembersTab();

    // Verify the invited user appears in the members list
    const members = await spaceSettingsPage.listMembers();
    const memberNames = members.map((m) => m.displayName);

    expect(memberNames).toContain(invitedDisplayName);
  });
});
