import { expect } from '@playwright/test';
import { testWithUserSignedUp } from '../../fixtures/packmindTest';

// The connection drawer should call the check-auth probe on open and reflect
// its result (Disconnected when unauthorized) without forcing the user to
// open Manage repos. We stub the Packmind API responses so the test is
// deterministic and doesn't depend on a real GitHub credential.
testWithUserSignedUp.describe('Connection status probe', () => {
  testWithUserSignedUp(
    'surfaces a revoked PAT as Disconnected in the drawer status block',
    async ({ page, dashboardPage }) => {
      const fakeProvider = {
        id: 'prov-e2e-revoked',
        source: 'github',
        organizationId: 'org-e2e',
        url: 'https://github.com',
        hasAuth: true,
        authMethod: 'token',
      };

      await page.route(
        '**/organizations/*/git/providers',
        async (route, request) => {
          if (request.method() !== 'GET') {
            await route.fallback();
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ providers: [fakeProvider] }),
          });
        },
      );

      await page.route(
        '**/organizations/*/git/repositories/provider/*',
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]',
          }),
      );

      await page.route(
        '**/organizations/*/git/providers/*/available-repos',
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]',
          }),
      );

      await page.route(
        '**/organizations/*/git/providers/*/check-auth',
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: false, reason: 'unauthorized' }),
          }),
      );

      // Reload so the stubs are in place before any background query fires.
      await dashboardPage.reload();

      const settingsPage = await dashboardPage.openSettings();
      const gitSettingsPage = await settingsPage.openGitSettings();

      await gitSettingsPage.openFirstConnectionDrawer();
      await gitSettingsPage.waitForDrawerStatus('disconnected');

      const description = await gitSettingsPage.getDrawerStatusDescription();
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(description).toContain('Token rejected by the provider');
    },
  );
});
