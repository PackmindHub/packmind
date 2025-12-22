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

  async getInvitationLink(): Promise<string> {
    // Open the ellipsis menu for the invited user (first row with pending invitation)
    const ellipsisButton = this.page
      .locator('table tbody tr')
      .filter({ hasText: 'Invitation pending' })
      .first()
      .locator('button')
      .first();

    await ellipsisButton.click();

    // Get the invitation link from the copy button
    const copyLinkElement = this.page.getByTestId(
      UsersPageDataTestIds.InvitationLinkCopyCTA,
    );

    // Find the PMCopiable.Root which contains the invitation link value
    const copiableRoot = copyLinkElement.locator(
      'xpath=ancestor::*[@data-scope="clipboard"]',
    );
    const invitationLink = await copiableRoot.getAttribute('data-value');

    if (!invitationLink) {
      throw new Error('Could not find invitation link');
    }

    // Close the menu by clicking elsewhere
    await this.page.keyboard.press('Escape');

    return invitationLink;
  }

  expectedUrl(): string | RegExp {
    return /\/settings\/users$/;
  }
}
