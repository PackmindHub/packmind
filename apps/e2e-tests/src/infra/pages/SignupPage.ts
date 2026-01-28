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

    // Wait for redirect to onboarding reason page
    await this.page.waitForURL('**/sign-up/create-organization');
    // Skip the onboarding reason step
    await this.page.getByTestId('CreateOrganizationForm.SubmitButton').click();

    // Wait for redirect to onboarding reason page
    await this.page.waitForURL('**/sign-up/onboarding-reason');

    // Select the first onboarding reason option
    await this.page
      .getByText('Keeping instructions under control as our setup grows')
      .click();

    // Click the continue button
    await this.page.getByTestId('OnboardingReason.ContinueButton').click();

    return this.pageFactory.getDashboardPage();
  }

  expectedUrl(): string {
    return '/sign-up/create-account';
  }
}
