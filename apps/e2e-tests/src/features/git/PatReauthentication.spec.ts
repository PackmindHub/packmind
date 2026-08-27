import { expect, Page } from '@playwright/test';
import { testWithUserSignedUp } from '../../fixtures/packmindTest';

// A PAT connection whose token no longer works is the only way back into a
// broken connection, so the body the drawer sends must actually carry the new
// token. It once carried nothing at all — the gateway only forwarded a token
// when an authMethod came with it — and the backend answered "Git provider
// update data is required", leaving the connection unrecoverable.
const fakeProvider = {
  id: 'prov-e2e-pat-reauth',
  source: 'github',
  organizationId: 'org-e2e',
  url: 'https://github.com',
  hasAuth: true,
  authMethod: 'token',
  displayName: '',
};

type CapturedUpdate = { body: unknown };

async function stubPatProvider(
  page: Page,
  captured: CapturedUpdate,
): Promise<void> {
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

  await page.route('**/organizations/*/git/providers/*/check-auth', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, reason: 'unauthorized' }),
    }),
  );

  // The update endpoint records what the drawer sent and echoes the provider
  // back, so the drawer can complete its success state.
  await page.route(
    `**/organizations/*/git/providers/${fakeProvider.id}`,
    async (route, request) => {
      if (request.method() !== 'PUT') {
        await route.fallback();
        return;
      }
      captured.body = request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeProvider),
      });
    },
  );
}

testWithUserSignedUp.describe('PAT re-authentication', () => {
  testWithUserSignedUp(
    'sends the new token when re-authenticating a personal access token connection',
    async ({ page, dashboardPage }) => {
      const captured: CapturedUpdate = { body: undefined };
      await stubPatProvider(page, captured);

      // Reload so the stubs are in place before any background query fires.
      await dashboardPage.reload();

      const settingsPage = await dashboardPage.openSettings();
      const gitSettingsPage = await settingsPage.openGitSettings();

      await gitSettingsPage.openFirstConnectionDrawer();
      await gitSettingsPage.openReauthFromDrawer();
      await gitSettingsPage.submitReauthToken('ghp_e2e_rotated_token');
      await gitSettingsPage.waitForReauthAccepted();

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(captured.body).toEqual({ token: 'ghp_e2e_rotated_token' });
    },
  );
});
