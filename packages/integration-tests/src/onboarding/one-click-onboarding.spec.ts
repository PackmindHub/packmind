import { TestApp } from '../helpers/TestApp';
import { lessThanOrEqual } from '../helpers/testMatchers';
import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { accountsSchemas } from '@packmind/accounts';
import { Organization, User } from '@packmind/types';
import * as jwt from 'jsonwebtoken';

describe('One click on-boarding', () => {
  let testApp: TestApp;
  let dataSource: DataSource;
  let user: User;
  let organization: Organization;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([...accountsSchemas]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(dataSource);
    await testApp.initialize();

    const startTrialResult = await testApp.accountsHexa
      .getAdapter()
      .startTrial({
        agent: 'vs-code',
      });

    user = startTrialResult.user;
    organization = startTrialResult.organization;
  });

  it('creates a random user', async () => {
    expect(user).toEqual(
      expect.objectContaining({
        trial: true,
        email: expect.stringMatching(/trial-.*@packmind.trial/),
        memberships: [expect.objectContaining({ role: 'admin' })],
      }),
    );
  });

  it('allows user to get an activation token', async () => {
    const { activationToken } = await testApp.accountsHexa
      .getAdapter()
      .generateTrialActivationToken({
        userId: user.id,
        organizationId: organization.id,
      });

    const decoded = jwt.decode(activationToken);
    const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 5 * 60;

    expect(decoded).toEqual(
      expect.objectContaining({
        userId: user.id,
        type: 'trial_activation',
        exp: lessThanOrEqual(fiveMinutesFromNow),
      }),
    );
  });
});
