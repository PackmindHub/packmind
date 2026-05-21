import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { ISpaceSettingsPage } from '../../domain/pages';

export class SpaceSettingsPage
  extends AbstractPackmindAppPage
  implements ISpaceSettingsPage
{
  async openMembersTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Members' }).click();
  }

  async clickAddMembers(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add members' }).click();
  }

  async searchAndSelectMember(displayName: string): Promise<void> {
    const comboboxInput = this.page.getByPlaceholder('e.g., alice.wilson');
    await comboboxInput.fill(displayName);

    await this.page
      .locator('[data-part="item-text"]')
      .filter({ hasText: displayName })
      .first()
      .click();
  }

  async submitAddMembers(): Promise<void> {
    await this.page.getByRole('button', { name: /Add.*member/ }).click();

    // Wait for success toast
    await this.page.getByText('Members added').waitFor({ state: 'visible' });
  }

  async listMembers(): Promise<{ displayName: string }[]> {
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    const members: { displayName: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const displayName = await row
        .getByTestId('member-display-name')
        .innerText();
      members.push({
        displayName: displayName.replace(/\s*You\s*$/, '').trim(),
      });
    }

    return members;
  }

  expectedUrl(): string | RegExp {
    return /\/space\/[^/]+\/settings/;
  }
}
