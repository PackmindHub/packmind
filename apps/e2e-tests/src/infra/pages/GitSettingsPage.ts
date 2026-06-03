import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { IGitSettingsPage } from '../../domain/pages';

type GitProviderEntry = {
  provider: string;
  repositoriesCount: number;
  tokenLess: boolean;
};

export class GitSettings
  extends AbstractPackmindAppPage
  implements IGitSettingsPage
{
  async listGitProviders(): Promise<GitProviderEntry[]> {
    await this.page.getByRole('tab', { name: /Connections/ }).waitFor();

    const userConfigured = await this.readUserConfigured();
    const cliManaged = await this.readCliManaged();

    return [...userConfigured, ...cliManaged];
  }

  private async readUserConfigured(): Promise<GitProviderEntry[]> {
    await this.page.getByRole('tab', { name: /Connections/ }).click();

    const rows = this.page.locator('[data-testid="git-connection-row"]');
    const emptyState = this.page.getByText('No connections yet');
    await Promise.race([
      rows.first().waitFor({ state: 'attached', timeout: 5000 }),
      emptyState.waitFor({ state: 'attached', timeout: 5000 }),
    ]).catch(() => undefined);

    const count = await rows.count();
    const result: GitProviderEntry[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const provider = (await row.getAttribute('data-vendor')) ?? '';
      const repoCount = parseInt(
        (await row.getAttribute('data-repo-count')) ?? '0',
        10,
      );

      result.push({
        provider: provider.toLowerCase(),
        repositoriesCount: repoCount,
        tokenLess: false,
      });
    }

    return result;
  }

  private async readCliManaged(): Promise<GitProviderEntry[]> {
    await this.page.getByRole('tab', { name: /CLI-managed/ }).click();

    const rows = this.page.locator('[data-testid="cli-managed-row"]');
    const emptyState = this.page.getByText('No CLI-managed entries yet.');
    await Promise.race([
      rows.first().waitFor({ state: 'attached', timeout: 5000 }),
      emptyState.waitFor({ state: 'attached', timeout: 5000 }),
    ]).catch(() => undefined);

    const count = await rows.count();
    const grouped = new Map<string, { provider: string; count: number }>();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const providerId = (await row.getAttribute('data-provider-id')) ?? '';
      const vendor = (await row.getAttribute('data-vendor')) ?? '';

      const existing = grouped.get(providerId);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(providerId, {
          provider: vendor.toLowerCase(),
          count: 1,
        });
      }
    }

    return Array.from(grouped.values()).map(({ provider, count }) => ({
      provider,
      repositoriesCount: count,
      tokenLess: true,
    }));
  }

  expectedUrl(): string | RegExp {
    return /\/settings\/git$/;
  }
}
