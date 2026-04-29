// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';

import {
  describeWithUserSignedUp,
  UserSignedUpContext,
} from './describeWithUserSignedUp';
import { UserOrganizationRole } from '@packmind/types';
import { PackmindGateway } from './gateways/PackmindGateway';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from './userFactory';
import { getPackmindInstanceUrl } from './config';

export type WithMemberContext = UserSignedUpContext & {
  extraUserApiKey: string;
};

export type ExtraUserOptions = {
  email: string;
  role: UserOrganizationRole;
};

function getDefaultOptions(): ExtraUserOptions {
  return {
    email: `test-${uuidv4()}@example.com`,
    role: 'member',
  };
}

export function describeWithExtraUser(
  description: string,
  tests: (getContext: () => Promise<WithMemberContext>) => void,
  userOptions?: Partial<ExtraUserOptions>,
): void {
  describeWithUserSignedUp(description, () => {
    let extraUserOptions: ExtraUserOptions;

    // Set up user context using jest-stage
    stage(async (context: UserSignedUpContext): Promise<WithMemberContext> => {
      extraUserOptions = { ...getDefaultOptions(), ...userOptions };

      const user = createTestUser({ email: extraUserOptions.email });

      const invitedUsers = await context.gateway.accounts.createInvitations({
        emails: [user.email],
        role: extraUserOptions.role,
      });

      const userGateway = new PackmindGateway(getPackmindInstanceUrl());

      await userGateway.auth.signupWithInvitation({
        password: user.password,
        token: invitedUsers.created[0].invitation.token,
      });
      await userGateway.auth.signin({
        email: user.email,
        password: user.password,
      });
      const userApiKeyResponse = await userGateway.auth.generateApiKey({});
      const userApiKey = userApiKeyResponse.apiKey;

      userGateway.initializeWithApiKey(userApiKey);

      return {
        ...context,
        extraUserApiKey: userApiKey,
      };
    });

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
