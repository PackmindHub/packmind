import {
  ICliSetupPage,
  IDashboardPage,
  IPackagesPage,
  IPackmindAppPage,
  ICommandsPage,
  ISettingsPage,
  ISkillsPage,
  ISpaceContextPage,
  ISpaceSettingsPage,
  IStandardsPage,
} from '../../domain/pages';
import { AbstractPackmindPage } from './AbstractPackmindPage';
import {
  SidebarAccountsMenuDataTestIds,
  SidebarNavigationDataTestId,
} from '@packmind/frontend';
import { SpaceType } from '@packmind/types';

export abstract class AbstractPackmindAppPage
  extends AbstractPackmindPage
  implements IPackmindAppPage
{
  openCommands(): Promise<ICommandsPage> {
    throw new Error('Not implemented yet');
  }

  async openSkills(): Promise<ISkillsPage> {
    // The Skills link lives under a space's nav section. On org-only
    // routes (settings/setup/profile) no space is active, so the link is
    // not rendered in the sidebar — open the default space drawer first
    // to reveal it.
    const skillsLink = this.page.getByTestId(
      SidebarNavigationDataTestId.SkillsLink,
    );

    if (!(await skillsLink.first().isVisible())) {
      await this.page
        .getByTestId(SidebarNavigationDataTestId.DefaultSpaceRow)
        .click();
      const openDrawer = this.page.locator(
        '[role="dialog"][data-state="open"]',
      );
      await openDrawer.waitFor({ state: 'visible' });
      await openDrawer
        .getByTestId(SidebarNavigationDataTestId.SkillsLink)
        .click();
    } else {
      await skillsLink.click();
    }

    return this.pageFactory.getSkillsPage();
  }

  async openStandards(): Promise<IStandardsPage> {
    await this.page.getByRole('link', { name: 'Standards' }).click();

    return this.pageFactory.getStandardsPage();
  }

  async openPackages(): Promise<IPackagesPage> {
    // The Packages link lives under a space's nav section. On org-only
    // routes (settings/setup/profile) no space is active, so the link is
    // not rendered in the sidebar — open the default space drawer first
    // to reveal it.
    const packagesLink = this.page.getByTestId(
      SidebarNavigationDataTestId.PackagesLink,
    );

    if (!(await packagesLink.first().isVisible())) {
      await this.page
        .getByTestId(SidebarNavigationDataTestId.DefaultSpaceRow)
        .click();
      const openDrawer = this.page.locator(
        '[role="dialog"][data-state="open"]',
      );
      await openDrawer.waitFor({ state: 'visible' });
      await openDrawer
        .getByTestId(SidebarNavigationDataTestId.PackagesLink)
        .click();
    } else {
      await packagesLink.click();
    }

    return this.pageFactory.getPackagesPage();
  }

  async openSettings(): Promise<ISettingsPage> {
    await this.page
      .getByTestId(SidebarNavigationDataTestId.SettingsLink)
      .click();

    return this.pageFactory.getSettingsPage();
  }

  async openIntegrations(): Promise<ICliSetupPage> {
    await this.page
      .getByTestId(SidebarNavigationDataTestId.IntegrationsLink)
      .click();

    return this.pageFactory.getCliSetupPage();
  }

  async openSpaceSettings(): Promise<ISpaceSettingsPage> {
    await this.page
      .locator(
        `[data-testid="${SidebarNavigationDataTestId.SpaceSettingsLink}"]:not(.space-settings-btn)`,
      )
      .click();

    return this.pageFactory.getSpaceSettingsPage();
  }

  /**
   * The Context surface of the current space, opened on one package.
   *
   * The org and space are read off the current URL rather than passed in: a
   * spec knows the package it seeded, not the slugs the sign-up fixture
   * produced. `?nav=plugin-first` pins the navigation for the rest of the test,
   * overriding the `today` mode every browser context starts on — the surface
   * has no sidebar entry in that mode.
   */
  async openPackageInContext(packageId: string): Promise<ISpaceContextPage> {
    const spaceRoute = /\/org\/([^/]+)\/space\/([^/]+)/;

    if (!spaceRoute.test(this.page.url())) {
      // Org-only routes (settings/setup/profile) name no space, and the
      // `packmindApi` fixture leaves the browser on one of them. Open the
      // space's Packages list first — it knows how to reach the default space
      // from there — and read the slugs off the URL it lands on.
      await this.openPackages();
    }

    const location = spaceRoute.exec(this.page.url());

    if (!location) {
      throw new Error(
        `Cannot open the Context surface from ${this.page.url()}: no org and space in the URL.`,
      );
    }

    const [, orgSlug, spaceSlug] = location;
    await this.page.goto(
      `/org/${orgSlug}/space/${spaceSlug}/context?nav=plugin-first&package=${packageId}`,
    );

    return this.pageFactory.getSpaceContextPage();
  }

  async createSpace(
    name: string,
    options?: { type?: SpaceType },
  ): Promise<IDashboardPage> {
    await this.page.getByTestId('browse-spaces-trigger').click();
    await this.page.getByTestId('browse-spaces-new-button').click();
    await this.page.getByTestId('create-space-name-input').fill(name);

    if (options?.type) {
      await this.page
        .getByTestId('create-space-type-select')
        .locator('select')
        .selectOption(options.type);
    }

    await this.page.getByTestId('create-space-submit').click();

    // CreateSpaceDialog runs `setOpen(false)` BEFORE `navigate(/space/<slug>)`,
    // so waiting on the dialog input to be hidden returns while the URL is
    // still on the previous space. The next call (e.g. openSpaceSettings)
    // would then act on the old sidebar block — for instance clicking the
    // default Global space's settings link, loading Global's members into
    // the AddMembers dialog, and breaking the test. Wait for the URL to
    // land on the new space's dashboard before returning.
    const expectedSlug = name.trim().toLowerCase().replace(/\s+/g, '-');
    await this.page.waitForURL(
      (url) =>
        url.pathname.endsWith(`/space/${expectedSlug}`) ||
        url.pathname.includes(`/space/${expectedSlug}/`),
    );

    return this.pageFactory.getDashboardPage();
  }

  async navigateToDashboard(): Promise<IDashboardPage> {
    await this.page.getByRole('link', { name: 'Dashboard' }).first().click();

    return this.pageFactory.getDashboardPage();
  }

  async navigateToSpace(spaceName: string): Promise<IDashboardPage> {
    const currentUrl = this.page.url();

    // Clicking an inactive space opens a drawer panel
    await this.page
      .locator('button')
      .filter({ hasText: spaceName })
      .first()
      .click();

    // Wait for the drawer Content to be in `data-state="open"`. zag-js puts
    // `data-state` on the same node as `role="dialog"`, so the attribute must
    // be combined into one selector — a descendant search finds nothing.
    const openDrawer = this.page
      .locator('[role="dialog"][data-state="open"]')
      .filter({ hasText: spaceName });
    await openDrawer.waitFor({ state: 'visible' });

    // Playwright's auto-wait on click handles stability through the open
    // animation — no extra animation barrier needed (and `getAnimations()`
    // evaluates against an element that React can unmount mid-call).
    await openDrawer.getByRole('link', { name: 'Dashboard' }).click();

    // Wait for actual navigation (URL was already matching /org/** so waitForLoaded won't wait)
    await this.page.waitForURL((url) => url.toString() !== currentUrl);

    // The closing drawer keeps its Content (and its in-drawer Standards /
    // Skills / Commands links) mounted during the exit animation. If we
    // return before it detaches, the next `getByRole('link', { name: ... })`
    // call collides with the sidebar's own copies of those links and fails
    // with a strict-mode violation. Wait for the dialog itself to detach.
    await this.page
      .locator('[role="dialog"]')
      .filter({ hasText: spaceName })
      .waitFor({ state: 'detached' });

    return this.pageFactory.getDashboardPage();
  }

  async signOut(): Promise<void> {
    await this.page
      .getByTestId(SidebarAccountsMenuDataTestIds.SignoutCTA)
      .click();

    // Wait for the sign out to complete (redirected to sign-in page)
    await this.page.waitForURL(/\/(sign-in|sign-up|get-started)/);
  }
}
