import {
  IStandardPage,
  IStandardsPage,
  ICreateStandardPage,
} from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class StandardsPage
  extends AbstractPackmindAppPage
  implements IStandardsPage
{
  async listStandards(): Promise<{ name: string }[]> {
    // Wait for the standards table to appear (data may still be loading)
    await this.page.locator('table tbody tr').first().waitFor();

    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    const result: { name: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const link = row.locator('a');
      const name = await link.innerText();
      result.push({ name: name.trim() });
    }

    return result;
  }

  openCreateStandards(): Promise<ICreateStandardPage> {
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  openStandard(_name: string): Promise<IStandardPage> {
    throw new Error('Not implemented yet');
  }

  async selectStandardByName(name: string): Promise<void> {
    const row = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.getByRole('link', { name }) });
    await row.locator('[data-part="control"]').click();
  }

  async selectAll(): Promise<void> {
    await this.page.locator('table thead [data-part="control"]').click();
  }

  async moveToSpace(spaceName: string): Promise<void> {
    await this.page.getByTestId('move-to-space-button').click();

    // Open the destination space select
    await this.page.getByText('Select a destination space').click();

    // Select the destination space
    await this.page
      .locator('[data-part="item"]')
      .filter({ hasText: spaceName })
      .click();

    // Click Move button in the dialog
    await this.page.getByRole('button', { name: 'Move' }).click();

    // Wait for success toast
    await this.page.getByText('moved to the selected space').waitFor();
  }

  async hasNoStandards(): Promise<boolean> {
    return this.page.getByText('No standards yet').isVisible();
  }

  expectedUrl(): RegExp {
    return /.*\/standards$/;
  }
}
