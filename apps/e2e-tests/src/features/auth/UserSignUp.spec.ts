import { IPageFactory } from '../../domain/pages';
import { PageFactory } from '../../infra/PageFactory';
import { testWithUserData } from '../../fixtures/packmindTest';

testWithUserData('User can signup', async ({ userData, page }) => {
  const pageFactory: IPageFactory = new PageFactory(page);

  const signupPage = await pageFactory.getSignupPage();
  const dashboardPage = await signupPage.signup(
    userData.email,
    userData.password,
    userData.organizationName,
  );

  await dashboardPage.expectWelcomeMessage();
});
