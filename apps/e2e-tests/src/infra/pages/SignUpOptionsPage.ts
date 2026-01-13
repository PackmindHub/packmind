import { AbstractPackmindPage } from './AbstractPackmindPage';
import { ISignUpPage, ISignUpOptionsPage } from '../../domain/pages';
import { SignUpOptionsDataTestIds } from '@packmind/frontend';

export class SignUpOptionsPage
  extends AbstractPackmindPage
  implements ISignUpOptionsPage
{
  async clickCreateAccount(): Promise<ISignUpPage> {
    await this.page
      .getByTestId(SignUpOptionsDataTestIds.CreateAccountButton)
      .click();

    return this.pageFactory.getSignupFormPage();
  }

  expectedUrl(): string {
    return '/sign-up';
  }
}
