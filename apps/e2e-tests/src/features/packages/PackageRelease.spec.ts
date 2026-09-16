import { expect } from '@playwright/test';
import { Package, Standard } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';

testWithApi.describe('package release', () => {
  let standard: Standard;
  let releasablePackage: Package;

  testWithApi.beforeEach(async ({ packmindApi, dashboardPage }) => {
    standard = await apiStandardFactory(packmindApi);
    releasablePackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });

    await dashboardPage.reload();
  });

  testWithApi(
    'it cuts a release and shows the new version as the current version',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await contextPage.getCurrentVersion()).toBe('Not released yet');

      await contextPage.createRelease('0.1.0');

      // The version area re-renders when the mutation's invalidation lands, so
      // a single immediate read would be a coin toss.
      // eslint-disable-next-line playwright/no-standalone-expect
      await expect.poll(() => contextPage.getCurrentVersion()).toBe('0.1.0');
    },
  );

  testWithApi(
    'it lists what a release pinned when browsing that version',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      await contextPage.createRelease('0.1.0');

      await contextPage.openReleaseHistory();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await contextPage.listComponentsPinnedBy('0.1.0')).toEqual([
        `${standard.name} v1`,
      ]);
    },
  );
});
