import { IPackagePage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class PackagePage
  extends AbstractPackmindAppPage
  implements IPackagePage
{
  async openDistributionsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Distributions' }).click();
  }

  async listDistributions(): Promise<{ target: string; author: string }[]> {
    const rows = this.page.locator(
      '[id*="content-distributions"] table tbody tr',
    );

    const count = await rows.count();
    const result: { target: string; author: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      const target = await row.locator('td').nth(0).innerText();
      const author = await row.locator('td').nth(3).innerText();

      result.push({ target: target.trim(), author: author.trim() });
    }

    return result;
  }

  expectedUrl() {
    return /packages\/[0-9a-f-]+$/;
  }
}
