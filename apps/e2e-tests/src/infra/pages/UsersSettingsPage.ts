import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { IUsersSettingsPage } from '../../domain/pages';
import { UsersPageDataTestIds } from '@packmind/frontend';

export class UsersSettingsPage
  extends AbstractPackmindAppPage
  implements IUsersSettingsPage
{
  async inviteUser(email: string): Promise<void> {
    await this.page.getByTestId(UsersPageDataTestIds.InviteUsersCTA).click();

    await this.page
      .getByTestId(UsersPageDataTestIds.InviteUsersEmailInput)
      .fill(email);

    await this.page
      .getByTestId(UsersPageDataTestIds.InviteUsersSubmitCTA)
      .click();

    // Wait for the invitation to be created (toast message appears)
    await this.page.waitForSelector('text=Users Processed');
  }

  async getInvitationToken(): Promise<string> {
    // Open the ellipsis menu for the invited user (first row with pending invitation)
    const ellipsisButton = this.page
      .locator('table tbody tr')
      .filter({ hasText: 'Invitation pending' })
      .first()
      .locator('button')
      .first();

    await ellipsisButton.click();

    // Wait for the menu to open and find the clipboard element with the invitation link
    const copyLinkElement = this.page.getByTestId(
      UsersPageDataTestIds.InvitationLinkCopyCTA,
    );
    await copyLinkElement.waitFor({ state: 'visible' });

    // Get the invitation link from the data-value attribute on the text element
    const invitationLink = await copyLinkElement
      .locator('[data-value]')
      .getAttribute('data-value');

    if (!invitationLink) {
      throw new Error('Could not find invitation link');
    }

    // Close the menu by clicking elsewhere
    await this.page.keyboard.press('Escape');

    // Extract the token from the URL (e.g., /activate?token=xyz -> xyz)
    const url = new URL(invitationLink, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Could not extract token from invitation link');
    }

    return token;
  }

  expectedUrl(): string | RegExp {
    return /\/settings\/users$/;
  }
}
