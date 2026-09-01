import {
  NotifyDistributionCommand,
  Package,
  PackmindCommandBody,
  Standard,
} from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';
import { expect } from '@playwright/test';

testWithApi.describe('packmind-cli install', () => {
  let standard: Standard;
  let defaultPackage: Package;
  let notifyDistributionCommand: PackmindCommandBody<NotifyDistributionCommand>;
  const gitRepoOwner = 'my-company';
  const gitRepoName = 'my-repo';

  testWithApi.beforeEach(async ({ packmindApi, dashboardPage }) => {
    standard = await apiStandardFactory(packmindApi);
    defaultPackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });
    notifyDistributionCommand = {
      distributedPackages: [defaultPackage.slug],
      gitBranch: 'main',
      gitRemoteUrl: `github.com/${gitRepoOwner}/${gitRepoName}`,
      relativePath: '/',
    };

    await packmindApi.notifyDistribution(notifyDistributionCommand);

    await dashboardPage.reload();
  });

  /*
   * The author is no longer part of this. The log used to carry a column for it
   * and dropped it, on the grounds that every row of one package's history
   * names the same person, so there is nothing in the UI left to read. What the
   * log does say is where the distribution landed and how it ended, which is
   * what the CLI reported and therefore what this test is about. Attribution to
   * the CLI user is now only checkable through the API, and this suite has no
   * gateway for reading distributions.
   */
  testWithApi(
    'it stores the new distribution of the package',
    async ({ dashboardPage }) => {
      const packagesPage = await dashboardPage.openPackages();
      const packagePage = await packagesPage.openPackage(defaultPackage.name);
      await packagePage.openDistributionsTab();
      await packagePage.openDistributionHistory();
      const distributions = await packagePage.listDistributions();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(distributions).toEqual([
        {
          repository: `${gitRepoOwner}/${gitRepoName}`,
          /*
           * The branch alone: the command distributed to the repository root,
           * and the log leaves the path out rather than printing a bare slash.
           */
          detail: notifyDistributionCommand.gitBranch,
          status: 'Success',
        },
      ]);
    },
  );

  testWithApi('it creates a new GitProvider', async ({ dashboardPage }) => {
    const settingsPage = await dashboardPage.openSettings();
    const gitSettingsPage = await settingsPage.openGitSettings();

    const providers = await gitSettingsPage.listGitProviders();

    // eslint-disable-next-line playwright/no-standalone-expect
    expect(providers).toEqual([
      {
        provider: 'github',
        repositoriesCount: 1,
        tokenLess: true,
      },
    ]);
  });
});
