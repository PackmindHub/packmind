import { User, UserOrganizationRole } from '../entities/User';
import { Organization } from '../entities/Organization';
import { IPublicUseCase } from '@packmind/shared';

export type SignInUserCommand = {
  email: string;
  password: string;
};

export type SignInUserResponse = {
  user: User;
  organization?: Organization;
  role?: UserOrganizationRole;
  organizations?: Array<{
    organization: Organization;
    role: UserOrganizationRole;
  }>;
};

export type ISignInUserUseCase = IPublicUseCase<
  SignInUserCommand,
  SignInUserResponse
>;
