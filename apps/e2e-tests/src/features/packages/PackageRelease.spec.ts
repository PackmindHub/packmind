import { expect } from '@playwright/test';
import { Package, Standard } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';

testWithApi.describe('package release', () => {
  // The release surface is behind the package-releases feature flag (audience: @packmind.com, @promyze.com).
  // Setting underFeatureFlag: true signs up the test user as @packmind.com to access the release UI.
  testWithApi.use({ underFeatureFlag: true });

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
    'it says the package has no version before the first cut',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await contextPage.getReading()).toBe('Not released yet');
    },
  );

  testWithApi(
    'it cuts a release and offers it as a reading of the package',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      await contextPage.createRelease('0.1.0');

      // The bar re-renders when the mutation's invalidation lands, so a single
      // immediate read would be a coin toss.
      // eslint-disable-next-line playwright/no-standalone-expect
      await expect
        .poll(() => contextPage.listReleaseVersions())
        .toEqual(['0.1.0']);
    },
  );

  testWithApi(
    'it stays on the package as it stands once a release is cut',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      await contextPage.createRelease('0.1.0');

      // eslint-disable-next-line playwright/no-standalone-expect
      await expect.poll(() => contextPage.getReading()).toBe('Unreleased');
    },
  );

  testWithApi(
    'it lists what a release pinned when reading that version',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      await contextPage.createRelease('0.1.0');

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await contextPage.listComponentsPinnedBy('0.1.0')).toEqual([
        `${standard.name} v1`,
      ]);
    },
  );

  testWithApi(
    'it carries the refusal from the server to the form when the race is lost',
    async ({ dashboardPage, packmindApi }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      // Reading the bar first is what says the form has the package's releases
      // as they are now: nothing released, so the cut is offered.
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await contextPage.getReading()).toBe('Not released yet');

      // Two cuts behind the page's back and without reloading: the open form
      // still believes nothing has been released, the database is at 0.2.0.
      for (const version of ['0.1.0', '0.2.0']) {
        await packmindApi.createPackageRelease({
          spaceId: releasablePackage.spaceId,
          packageId: releasablePackage.id,
          version,
        });
      }

      // 0.1.0 is a legal first increment from the 0.0.0 the form still
      // believes in, so its own check passes and the request is really sent.
      const refusal = await contextPage.attemptRelease('0.1.0');

      // 0.2.0, the version the server re-read as it refused: the form never
      // held it, so the sentence can only have come over the wire.
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(refusal).toBe('Version must be greater than 0.2.0');
    },
  );

  testWithApi(
    'it offers no cut once the package is identical to its last release',
    async ({ dashboardPage }) => {
      const contextPage = await dashboardPage.openPackageInContext(
        releasablePackage.id,
      );

      await contextPage.createRelease('0.1.0');

      // The readiness is recomputed server-side and re-read when the mutation's
      // invalidation lands, so poll until the action goes.
      // eslint-disable-next-line playwright/no-standalone-expect
      await expect.poll(() => contextPage.canCreateRelease()).toBe(false);
    },
  );
});
