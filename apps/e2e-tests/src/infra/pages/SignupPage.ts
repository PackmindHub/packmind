import { AbstractPackmindPage } from './AbstractPackmindPage';
import { IDashboardPage, ISignUpPage } from '../../domain/pages';

import { SignUpWithOrganizationFormDataTestIds } from '@packmind/frontend';

export class SignupPage extends AbstractPackmindPage implements ISignUpPage {
  async signup(email: string, password: string): Promise<IDashboardPage> {
    console.log(`Creating user ${email} with password ${password}`);

    await this.page
      .getByTestId(SignUpWithOrganizationFormDataTestIds.EmailField)
      .fill(email);
    await this.page
      .getByTestId(SignUpWithOrganizationFormDataTestIds.PasswordField)
      .fill(password);
    await this.page
      .getByTestId(SignUpWithOrganizationFormDataTestIds.ConfirmPasswordField)
      .fill(password);
    await this.page
      .getByTestId(SignUpWithOrganizationFormDataTestIds.Submit)
      .click();

    // After sign-up + auto-login the user lands directly on the org dashboard.
    return this.pageFactory.getDashboardPage();
  }

  expectedUrl(): string {
    return '/sign-up/create-account';
  }
}
