import { AbstractPackmindPage } from './AbstractPackmindPage';
import { IActivateAccountPage, IDashboardPage } from '../../domain/pages';
import { ActivateTrialAccountFormDataTestIds } from '@packmind/frontend';
import { SignUpWithOrganizationCommand } from '@packmind/types';

export class ActivateAccountPage
  extends AbstractPackmindPage
  implements IActivateAccountPage
{
  async activateAccount(
    userData: Pick<
      SignUpWithOrganizationCommand,
      'organizationName' | 'email' | 'password'
    >,
  ): Promise<IDashboardPage> {
    await this.page
      .getByTestId(ActivateTrialAccountFormDataTestIds.OrganizationField)
      .fill(userData.organizationName);

    await this.page
      .getByTestId(ActivateTrialAccountFormDataTestIds.EmailField)
      .fill(userData.email);

    await this.page
      .getByTestId(ActivateTrialAccountFormDataTestIds.PasswordField)
      .fill(userData.password);

    await this.page
      .getByTestId(ActivateTrialAccountFormDataTestIds.ConfirmPasswordField)
      .fill(userData.password);

    await this.page
      .getByTestId(ActivateTrialAccountFormDataTestIds.Submit)
      .click();

    return this.pageFactory.getDashboardPage();
  }

  expectedUrl(): RegExp {
    return /\/activate-account\?token=/;
  }
}
