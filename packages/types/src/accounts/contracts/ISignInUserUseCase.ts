import { User, UserOrganizationRole } from '../User';
import { Organization } from '../Organization';
import { IPublicUseCase } from '../../UseCase';

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
