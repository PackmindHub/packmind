import { TestApp } from '../helpers/TestApp';
import { lessThanOrEqual } from '../helpers/testMatchers';
import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { accountsSchemas } from '@packmind/accounts';
import {
  ActivateTrialAccountResult,
  Organization,
  User,
} from '@packmind/types';
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

  describe('when user activates its trial account', () => {
    const email = 'some-new-email@example.com';
    const password = 's3per-s3cr3t';
    const organizationName = 'My organization';
    let activateTrialResponse: ActivateTrialAccountResult;

    beforeEach(async () => {
      const { activationToken } = await testApp.accountsHexa
        .getAdapter()
        .generateTrialActivationToken({
          userId: user.id,
          organizationId: organization.id,
        });

      activateTrialResponse = await testApp.accountsHexa
        .getAdapter()
        .activateTrialAccount({
          activationToken,
          email,
          password,
          organizationName,
        });
    });

    it('returns the updated user data', async () => {
      expect(activateTrialResponse).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: user.id,
            email: 'some-new-email@example.com',
          }),
          organization: expect.objectContaining({
            id: organization.id,
            name: 'My organization',
          }),
        }),
      );
    });

    it('allows the user to sign-in with its new email and password', async () => {
      const signInResult = await testApp.accountsHexa
        .getAdapter()
        .signInUser({ email, password });

      expect(signInResult).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: user.id,
            email: 'some-new-email@example.com',
          }),
          organization: expect.objectContaining({
            id: organization.id,
            name: 'My organization',
          }),
        }),
      );
    });
  });
});
