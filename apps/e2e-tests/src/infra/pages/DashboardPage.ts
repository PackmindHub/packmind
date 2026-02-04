import { IDashboardPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { expect } from '@playwright/test';

export class DashboardPage
  extends AbstractPackmindAppPage
  implements IDashboardPage
{
  async skipOnboardingModal(): Promise<void> {
    const skipLink = this.page.getByTestId('OnboardingWelcome.SkipLink');
    await skipLink.click();
    await skipLink.waitFor({ state: 'hidden' });
  }

  async expectWelcomeMessage(): Promise<void> {
    await this.skipOnboardingModal();
    await expect(this.page.locator('h1')).toContainText('Dashboard');
  }

  expectedUrl(): string {
    return '/org/**';
  }
}
