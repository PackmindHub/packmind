import { Package, Standard } from '@packmind/types';
import { withApi } from './fixtures/packmindTest';
import { apiStandardFactory } from './domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from './domain/apiDataFactories/apiPackageFactory';

withApi.describe('packmind-cli install', () => {
  let standard: Standard;
  let defaultPackage: Package;

  withApi.beforeEach(async ({ packmindApi }) => {
    standard = await apiStandardFactory(packmindApi);
    defaultPackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });

    await packmindApi.notifyDistribution({
      distributedPackages: [defaultPackage.id],
      gitBranch: 'main',
      gitRemoteUrl: 'github.com/my-company/my-repo',
      relativePath: '/',
    });
  });

  withApi('it stores the new distribution of the package', async () => {
    console.log({ standard, defaultPackage });
  });
});
