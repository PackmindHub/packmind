import { Package, Standard } from '@packmind/types';
import { testWithApi } from './fixtures/packmindTest';
import { apiStandardFactory } from './domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from './domain/apiDataFactories/apiPackageFactory';
import { expect } from '@playwright/test';

testWithApi.describe('packmind-cli install', () => {
  let standard: Standard;
  let defaultPackage: Package;

  testWithApi.beforeEach(async ({ packmindApi, dashboardPage }) => {
    standard = await apiStandardFactory(packmindApi);
    defaultPackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });

    await packmindApi.notifyDistribution({
      distributedPackages: [defaultPackage.slug],
      gitBranch: 'main',
      gitRemoteUrl: 'github.com/my-company/my-repo',
      relativePath: '/',
    });

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
          target: '/ in my-company/my-repo:main',
          author: userData.email,
        },
      ]);
    },
  );
});
