import { v4 as uuidv4 } from 'uuid';

import { testWithUserSignedUp } from '../../fixtures/packmindTest';
import { PageFactory } from '../../infra/PageFactory';

testWithUserSignedUp.describe('Invitation Workflow', () => {
  testWithUserSignedUp.skip(
    'admin invites a new user who successfully activates their account',
    async ({ dashboardPage, page }) => {
      const invitedEmail = `invited-${uuidv4()}@example.com`;
      const newUserPassword = uuidv4();

      // Navigate to settings / users
      const settingsPage = await dashboardPage.openSettings();
      const usersSettingsPage = await settingsPage.openUsersSettings();

      // Invite a new user
      await usersSettingsPage.inviteUser(invitedEmail);
      const invitationLink = await usersSettingsPage.getInvitationLink();

      // Sign out
      await usersSettingsPage.signOut();

      // Open the invitation link and activate the account
      const pageFactory = new PageFactory(page);
      const invitationPage =
        await pageFactory.getInvitationPage(invitationLink);
      const dashboardPageNewUser =
        await invitationPage.activateAccount(newUserPassword);

      // Ensure welcome message is displayed
      await dashboardPageNewUser.expectWelcomeMessage();
    },
  );
});
