import { test } from '@playwright/test';
import { IPageFactory } from './domain/pages';
import { PageFactory } from './infra/PageFactory';
import { v4 as uuidv4 } from 'uuid';

test('User can signup', async ({ page }) => {
  const pageFactory: IPageFactory = new PageFactory(page);

  const signupPage = await pageFactory.getSignupPage();
  const dashboardPage = await signupPage.signup(
    `someone${uuidv4()}@example.com`,
    uuidv4(),
    `my-organization-${uuidv4()}`,
  );

  await dashboardPage.expectWelcomeMessage();
});
