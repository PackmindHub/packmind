import { expect, Page } from '@playwright/test';
import { testWithUserSignedUp } from '../../fixtures/packmindTest';

// The connection drawer + list should both call the check-auth probe and
// reflect its result without forcing the user to open Manage repos. We stub
// the Packmind API responses so the tests are deterministic and don't depend
// on a real GitHub credential.
const fakeProvider = {
  id: 'prov-e2e-revoked',
  source: 'github',
  organizationId: 'org-e2e',
  url: 'https://github.com',
  hasAuth: true,
  authMethod: 'token',
  displayName: '',
};

async function stubRevokedPatProvider(page: Page): Promise<void> {
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

  await page.route('**/organizations/*/git/repositories/provider/*', (route) =>
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

  await page.route('**/organizations/*/git/providers/*/check-auth', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, reason: 'unauthorized' }),
    }),
  );
}

testWithUserSignedUp.describe('Connection status probe', () => {
  testWithUserSignedUp(
    'surfaces a revoked PAT as Token expired in the drawer status block',
    async ({ page, dashboardPage }) => {
      await stubRevokedPatProvider(page);

      // Reload so the stubs are in place before any background query fires.
      await dashboardPage.reload();

      const settingsPage = await dashboardPage.openSettings();
      const gitSettingsPage = await settingsPage.openGitSettings();

      await gitSettingsPage.openFirstConnectionDrawer();
      await gitSettingsPage.waitForDrawerStatus('token_expired');

      const description = await gitSettingsPage.getDrawerStatusDescription();
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(description).toContain('Token rejected by the provider');
    },
  );

  testWithUserSignedUp(
    'surfaces a revoked PAT as Token expired on the connection row',
    async ({ page, dashboardPage }) => {
      await stubRevokedPatProvider(page);

      await dashboardPage.reload();

      const settingsPage = await dashboardPage.openSettings();
      const gitSettingsPage = await settingsPage.openGitSettings();

      await gitSettingsPage.waitForFirstRowStatus('token_expired');

      const row = page.locator('[data-testid="git-connection-row"]').first();
      // eslint-disable-next-line playwright/no-standalone-expect
      await expect(row).toContainText('Token expired');
    },
  );
});
