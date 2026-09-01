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
   * The distribution log of the open package, one entry per row.
   *
   * Read by name and not by cell index. The index version broke the day the log
   * was redesigned: the destination became a repository above its branch, the
   * author column went away, and the fifth cell the suite was pointing at had
   * become the status, so it reported "Success" as the person who ran the
   * distribution.
   *
   * This tab renders the log directly, with nothing to unfold first. The
   * collapsed variant belongs to the surfaces of the new navigation, which this
   * page is not.
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
