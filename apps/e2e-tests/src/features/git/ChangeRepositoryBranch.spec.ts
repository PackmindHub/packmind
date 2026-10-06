import { expect, Page } from '@playwright/test';
import { Package } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';
import { IDashboardPage, IGitSettingsPage } from '../../domain/pages';

const owner = 'my-company';
const repo = 'my-repo';
const fullName = `${owner}/${repo}`;

/*
 * The suite has no real GitHub, so the repository, its tracking and its
 * distribution are real rows, while everything that would ask the provider is
 * answered here. A distribution recorded by the CLI lands on a token-less
 * provider, which the settings page lists apart and never opens in the drawer;
 * presenting that same provider as token-backed keeps its real repositories
 * behind the drawer, and the branch switches it applies go to the real API.
 */
async function stubProviderCalls(
  page: Page,
  branchExists: boolean,
): Promise<void> {
  await page.route('**/organizations/*/git/providers', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const { providers } = await response.json();
    await route.fulfill({
      response,
      json: {
        providers: providers.map((p: object) => ({
          ...p,
          hasAuth: true,
          authMethod: 'token',
        })),
      },
    });
  });

  await page.route('**/organizations/*/git/providers/*/check-auth', (route) =>
    route.fulfill({ json: { ok: true } }),
  );

  await page.route(
    '**/organizations/*/git/providers/*/available-repos*',
    (route) =>
      route.fulfill({
        json: {
          currentPage: 1,
          availablePages: 1,
          lastLoadedPage: 1,
          partial: false,
          repositories: [
            {
              name: repo,
              owner,
              fullName,
              private: true,
              defaultBranch: 'main',
              stars: 0,
            },
          ],
        },
      }),
  );

  await page.route(
    '**/organizations/*/git/repositories/*/tracked-branch-exists',
    (route) => route.fulfill({ json: { exists: true } }),
  );

  await page.route('**/organizations/*/git/providers/*/branches*', (route) =>
    route.fulfill({ json: { branches: ['dev', 'develop'] } }),
  );

  await page.route(
    '**/organizations/*/git/providers/*/branch-exists*',
    (route) => route.fulfill({ json: { exists: branchExists } }),
  );
}

// Both helpers reload first: the stubs are then in place before any background
// query fires, and no drawer is left open from a previous step.
async function openRepositoryEditor(
  dashboardPage: IDashboardPage,
): Promise<IGitSettingsPage> {
  await dashboardPage.reload();
  const settingsPage = await dashboardPage.openSettings();
  const gitSettingsPage = await settingsPage.openGitSettings();
  await gitSettingsPage.openFirstConnectionDrawer();
  await gitSettingsPage.openManageRepos();
  return gitSettingsPage;
}

async function readDistributions(
  dashboardPage: IDashboardPage,
  packageName: string,
) {
  await dashboardPage.reload();
  const packagesPage = await dashboardPage.openPackages();
  const packagePage = await packagesPage.openPackage(packageName);
  await packagePage.openDistributionsTab();
  return packagePage.listDistributions();
}

testWithApi.describe('changing a repository branch from the drawer', () => {
  let distributedPackage: Package;

  testWithApi.beforeEach(async ({ packmindApi }) => {
    const standard = await apiStandardFactory(packmindApi);
    distributedPackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });
    await packmindApi.notifyDistribution({
      distributedPackages: [distributedPackage.slug],
      gitBranch: 'main',
      gitRemoteUrl: `github.com/${fullName}`,
      relativePath: '/',
    });
    await packmindApi.setTrackedRepository({
      owner,
      repo,
      branch: 'main',
      origin: 'track',
      gitRemoteUrl: `github.com/${fullName}`,
    });
  });

  testWithApi.describe('when the branch is not on the provider', () => {
    let gitSettingsPage: IGitSettingsPage;

    testWithApi.beforeEach(async ({ page, dashboardPage }) => {
      await stubProviderCalls(page, false);
      gitSettingsPage = await openRepositoryEditor(dashboardPage);
      await gitSettingsPage.changeBranch(fullName, 'nope');
    });

    testWithApi('shows the branch as not found', async () => {
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await gitSettingsPage.branchError()).toEqual(
        `Branch nope not found in ${fullName}`,
      );
    });

    testWithApi('keeps the repository on its branch', async () => {
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await gitSettingsPage.listBranchesOf(fullName)).toEqual(['main']);
    });

    testWithApi('leaves nothing to apply', async () => {
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await gitSettingsPage.canApplyRepoChanges()).toBe(false);
    });
  });

  testWithApi.describe('when picking a suggested branch', () => {
    testWithApi.beforeEach(async ({ page, dashboardPage }) => {
      await stubProviderCalls(page, true);
      const gitSettingsPage = await openRepositoryEditor(dashboardPage);
      await gitSettingsPage.changeBranchFromSuggestions(
        fullName,
        'dev',
        'develop',
      );
      await gitSettingsPage.applyRepoChanges();
    });

    testWithApi('shows the picked branch only', async ({ dashboardPage }) => {
      const gitSettingsPage = await openRepositoryEditor(dashboardPage);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await gitSettingsPage.listBranchesOf(fullName)).toEqual([
        'develop',
      ]);
    });
  });

  testWithApi.describe('when switching to a branch that exists', () => {
    testWithApi.beforeEach(async ({ page, dashboardPage }) => {
      await stubProviderCalls(page, true);
      const gitSettingsPage = await openRepositoryEditor(dashboardPage);
      await gitSettingsPage.changeBranch(fullName, 'dev');
      await gitSettingsPage.applyRepoChanges();
    });

    testWithApi('shows the new branch only', async ({ dashboardPage }) => {
      const gitSettingsPage = await openRepositoryEditor(dashboardPage);

      // eslint-disable-next-line playwright/no-standalone-expect
      expect(await gitSettingsPage.listBranchesOf(fullName)).toEqual(['dev']);
    });

    testWithApi(
      "hides the previous branch's distributions",
      async ({ dashboardPage }) => {
        // eslint-disable-next-line playwright/no-standalone-expect
        expect(
          await readDistributions(dashboardPage, distributedPackage.name),
        ).toEqual([]);
      },
    );

    testWithApi.describe('and back to the previous branch', () => {
      testWithApi.beforeEach(async ({ dashboardPage }) => {
        const gitSettingsPage = await openRepositoryEditor(dashboardPage);
        await gitSettingsPage.changeBranch(fullName, 'main');
        await gitSettingsPage.applyRepoChanges();
      });

      testWithApi(
        'shows the previous branch only',
        async ({ dashboardPage }) => {
          const gitSettingsPage = await openRepositoryEditor(dashboardPage);

          // eslint-disable-next-line playwright/no-standalone-expect
          expect(await gitSettingsPage.listBranchesOf(fullName)).toEqual([
            'main',
          ]);
        },
      );

      testWithApi(
        "lists the previous branch's distributions again, and nothing from the other branch",
        async ({ dashboardPage }) => {
          // eslint-disable-next-line playwright/no-standalone-expect
          expect(
            await readDistributions(dashboardPage, distributedPackage.name),
          ).toEqual([
            { repository: fullName, detail: 'main', status: 'Success' },
          ]);
        },
      );
    });
  });
});
