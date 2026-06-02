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
    // Click first to force-open the combobox menu before typing — `fill`
    // alone does not always trigger Ark UI's open-on-change behavior.
    await comboboxInput.click();
    await comboboxInput.fill(displayName);

    const option = this.page
      .locator('[data-part="item-text"]')
      .filter({ hasText: displayName })
      .first();
    await option.waitFor({ state: 'visible' });
    await option.click();
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

  async getSpaceNameInput(): Promise<string> {
    return this.page.getByLabel('Name').inputValue();
  }

  async setSpaceName(name: string): Promise<void> {
    const input = this.page.getByLabel('Name');
    await input.clear();
    await input.fill(name);
  }

  async isSpaceNameDisabled(): Promise<boolean> {
    return this.page.getByLabel('Name').isDisabled();
  }

  async selectColor(color: string): Promise<void> {
    await this.page.getByLabel(`Select ${color} color`).click();
  }

  async clickSaveIdentity(): Promise<void> {
    await this.page
      .getByRole('button', { name: /Save changes/i })
      .first()
      .click();
  }

  async waitForIdentityUpdateSuccess(): Promise<void> {
    await this.page
      .getByText('Space updated')
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForIdentityUpdateError(): Promise<string> {
    const errorText = this.page.getByText(
      'Another space with a similar name already exists.',
    );
    await errorText.waitFor({ state: 'visible', timeout: 20000 });
    return errorText.innerText();
  }

  expectedUrl(): string | RegExp {
    return /\/space\/[^/]+\/settings/;
  }
}
