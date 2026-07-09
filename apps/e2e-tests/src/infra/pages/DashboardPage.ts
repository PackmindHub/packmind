import { IDashboardPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { expect } from '@playwright/test';

export class DashboardPage
  extends AbstractPackmindAppPage
  implements IDashboardPage
{
  async expectWelcomeMessage(): Promise<void> {
    // After sign-up + auto-login the user lands on the org's default space
    // overview page. Wait for that landing before asserting the heading.
    await this.waitForLoaded();
    await expect(this.page.locator('h1')).toContainText('Overview');
  }

  expectedUrl(): RegExp {
    return /\/org\/[^/]+\/space\/[^/]+/;
  }
}
