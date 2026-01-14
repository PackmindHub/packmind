import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { IGitSettingsPage } from '../../domain/pages';

export class GitSettings
  extends AbstractPackmindAppPage
  implements IGitSettingsPage
{
  async listGitProviders(): Promise<
    { provider: string; repositoriesCount: number; tokenLess: boolean }[]
  > {
    // Wait for the table to be populated with data by waiting for specific text content
    await this.page.waitForFunction(
      () => {
        const table = document.querySelector('table tbody');
        return table && table.querySelectorAll('tr').length > 0;
      },
      { timeout: 10000 },
    );

    // Give a small delay for React to fully render the content
    await this.page.waitForTimeout(500);

    const rows = this.page.locator('table tbody tr');

    const count = await rows.count();
    const result: {
      provider: string;
      repositoriesCount: number;
      tokenLess: boolean;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      const provider = await row.locator('td').nth(0).innerText();
      const repositoriesCountText = await row.locator('td').nth(2).innerText();
      const repositoriesCount = parseInt(repositoriesCountText.trim(), 10);

      const actionsCell = row.locator('td').nth(3);
      const tokenLess =
        (await actionsCell.locator('svg').count()) > 0 &&
        (await actionsCell.locator('button').count()) === 0;

      result.push({
        provider: provider.trim().toLowerCase(),
        repositoriesCount,
        tokenLess,
      });
    }

    return result;
  }

  expectedUrl(): string | RegExp {
    return /\/settings\/git$/;
  }
}
