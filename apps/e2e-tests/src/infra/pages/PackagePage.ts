import { Locator } from '@playwright/test';
import { DeploymentsHistoryDataTestId } from '@packmind/frontend';
import { DistributionLogEntry, IPackagePage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class PackagePage
  extends AbstractPackmindAppPage
  implements IPackagePage
{
  async openDistributionsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Distributions' }).click();
  }

  /**
   * Expands the distribution log, which the tab renders folded.
   *
   * A step of its own because it is a step the user takes. Without it the rows
   * are in the page but collapsed, and Playwright's `innerText` on a collapsed
   * element falls back to its text content rather than returning nothing: the
   * assertions here passed for a long time against a list nobody had opened,
   * which is how they came to depend on the exact shape of cells no reader had
   * ever seen.
   *
   * Idempotent, so a spec that opens it twice does not fold it again.
   */
  async openDistributionHistory(): Promise<void> {
    const trigger = this.page.getByRole('button', {
      name: 'Distribution history',
    });
    await trigger.waitFor();
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click();
    }
  }

  /**
   * The distribution log of the open package, one entry per row.
   *
   * Read by name and not by cell index. The index version broke the day the log
   * dropped two columns it knew nothing about: it went on reading the fifth
   * cell, which by then held the status rather than the author, and reported
   * "Success" as the person who ran the distribution.
   */
  async listDistributions(): Promise<DistributionLogEntry[]> {
    const rows = this.page.locator(
      '[id*="content-distributions"] table tbody tr',
    );
    /*
     * The tab renders before its query answers, so without this the count is
     * taken on an empty body and the assertion reads as "nothing was stored".
     */
    await rows.first().waitFor();

    const count = await rows.count();
    const result: DistributionLogEntry[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      result.push({
        repository: await this.textOf(
          row,
          DeploymentsHistoryDataTestId.DestinationRepository,
        ),
        detail: await this.textOf(
          row,
          DeploymentsHistoryDataTestId.DestinationDetail,
        ),
        status: await this.textOf(row, DeploymentsHistoryDataTestId.Status),
      });
    }

    return result;
  }

  private async textOf(
    row: Locator,
    testId: DeploymentsHistoryDataTestId,
  ): Promise<string> {
    return (await row.getByTestId(testId).innerText()).trim();
  }

  async isPackageEmpty(): Promise<boolean> {
    // Wait for package content to load (loading spinner disappears, content tab renders)
    await this.page.getByRole('tab', { name: 'Content' }).waitFor();
    await this.page
      .getByText('This package is empty')
      .waitFor({ timeout: 10000 });
    return true;
  }

  async listStandardsInPackage(): Promise<{ name: string }[]> {
    const standardsSection = this.page
      .locator('[id*="content-content"]')
      .locator('table')
      .first();
    const rows = standardsSection.locator('tbody tr');
    const count = await rows.count();
    const result: { name: string }[] = [];

    for (let i = 0; i < count; i++) {
      const name = await rows.nth(i).locator('a').innerText();
      result.push({ name: name.trim() });
    }

    return result;
  }

  expectedUrl() {
    return /packages\/[0-9a-f-]+$/;
  }
}
