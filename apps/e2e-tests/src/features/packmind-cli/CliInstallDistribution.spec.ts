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

  testWithApi(
    'it stores the new distribution of the package',
    async ({ userData, dashboardPage }) => {
      const packagesPage = await dashboardPage.openPackages();
      const packagePage = await packagesPage.openPackage(defaultPackage.name);
      await packagePage.openDistributionsTab();
      const distributions = await packagePage.listDistributions();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(distributions).toEqual([
        {
          target: `/ in ${gitRepoOwner}/${gitRepoName}:${notifyDistributionCommand.gitBranch}`,
          author: userData.email,
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
