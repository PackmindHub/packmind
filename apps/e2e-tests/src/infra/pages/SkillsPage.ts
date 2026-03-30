import { ISkillsPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class SkillsPage extends AbstractPackmindAppPage implements ISkillsPage {
  async listSkills(): Promise<{ name: string }[]> {
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

  async selectSkillByName(name: string): Promise<void> {
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

    await this.page.getByText('Select a destination space').click();

    await this.page
      .locator('[data-part="item"]')
      .filter({ hasText: spaceName })
      .click();

    await this.page.getByRole('button', { name: 'Move' }).click();

    await this.page.getByText('moved to the selected space').waitFor();
  }

  async moveToSpaceExpectingError(spaceName: string): Promise<string> {
    await this.page.getByTestId('move-to-space-button').click();

    await this.page.getByText('Select a destination space').click();

    await this.page
      .locator('[data-part="item"]')
      .filter({ hasText: spaceName })
      .click();

    await this.page.getByRole('button', { name: 'Move' }).click();

    const errorToast = this.page.getByText('already exists');
    await errorToast.waitFor();
    return errorToast.innerText();
  }

  async hasNoSkills(): Promise<boolean> {
    return this.page.getByText('No skills yet').isVisible();
  }

  expectedUrl(): RegExp {
    return /.*\/skills$/;
  }
}
