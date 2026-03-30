import {
  ICliSetupPage,
  IDashboardPage,
  IPackagesPage,
  IPackmindAppPage,
  ICommandsPage,
  ISettingsPage,
  ISkillsPage,
  IStandardsPage,
} from '../../domain/pages';
import { AbstractPackmindPage } from './AbstractPackmindPage';
import {
  SidebarAccountsMenuDataTestIds,
  SidebarNavigationDataTestId,
} from '@packmind/frontend';

export abstract class AbstractPackmindAppPage
  extends AbstractPackmindPage
  implements IPackmindAppPage
{
  openCommands(): Promise<ICommandsPage> {
    throw new Error('Not implemented yet');
  }

  async openSkills(): Promise<ISkillsPage> {
    await this.page.getByRole('link', { name: 'Skills' }).click();

    return this.pageFactory.getSkillsPage();
  }

  async openStandards(): Promise<IStandardsPage> {
    await this.page.getByRole('link', { name: 'Standards' }).click();

    return this.pageFactory.getStandardsPage();
  }

  async openPackages(): Promise<IPackagesPage> {
    await this.page
      .getByTestId(SidebarNavigationDataTestId.PackagesLink)
      .click();

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

  async createSpace(name: string): Promise<IDashboardPage> {
    await this.page.getByRole('button', { name: 'Create space' }).click();
    await this.page.getByTestId('create-space-name-input').fill(name);
    await this.page.getByTestId('create-space-submit').click();

    // Wait for dialog to close and navigation to the new space dashboard
    await this.page
      .getByTestId('create-space-name-input')
      .waitFor({ state: 'hidden' });

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

    // Click "Dashboard" link inside the drawer to navigate to that space
    const drawer = this.page.locator('[role="dialog"]').filter({
      hasText: spaceName,
    });
    await drawer.getByRole('link', { name: 'Dashboard' }).click();

    // Wait for actual navigation (URL was already matching /org/** so waitForLoaded won't wait)
    await this.page.waitForURL((url) => url.toString() !== currentUrl);

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
