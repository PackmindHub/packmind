import { AbstractPackmindPage } from './AbstractPackmindPage';
import { ISignUpPage, ISignUpOptionsPage } from '../../domain/pages';

export class SignUpOptionsPage
  extends AbstractPackmindPage
  implements ISignUpOptionsPage
{
  async clickCreateAccount(): Promise<ISignUpPage> {
    // Click on "Get started" button on splash screen
    await this.page.getByRole('button', { name: /get started/i }).click();

    // Wait for navigation to sign-up/create-account
    await this.page.waitForURL('**/sign-up/create-account');

    return this.pageFactory.getSignupFormPage();
  }

  expectedUrl(): string {
    return '/sign-up';
  }
}
