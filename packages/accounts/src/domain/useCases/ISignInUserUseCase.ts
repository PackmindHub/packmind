import { User } from '../entities/User';
import { Organization, OrganizationId } from '../entities/Organization';
import { IPublicUseCase } from '@packmind/shared';

export type SignInUserCommand = {
  username: string;
  password: string;
  organizationId: OrganizationId;
};

export type SignInUserResponse = {
  user: User;
  organization: Organization;
};

export type ISignInUserUseCase = IPublicUseCase<
  SignInUserCommand,
  SignInUserResponse
>;
