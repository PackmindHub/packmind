import { IDashboardPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { expect } from '@playwright/test';

export class DashboardPage
  extends AbstractPackmindAppPage
  implements IDashboardPage
{
  async expectWelcomeMessage(): Promise<void> {
    await expect(this.page.locator('h1')).toContainText('Dashboard');
  }

  expectedUrl(): string {
    return '/org/**';
  }
}
