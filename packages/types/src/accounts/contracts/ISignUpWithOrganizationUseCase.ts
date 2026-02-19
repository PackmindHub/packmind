import { IPublicUseCase } from '../../UseCase';
import { AuthMethod, User, Organization, SocialProvider } from '../index';

export type SignUpWithOrganizationCommand = {
  email: string;
  password?: string;
  method: AuthMethod;
  socialProvider?: SocialProvider;
};

export type SignUpWithOrganizationResponse = {
  user: User;
  organization: Organization;
};

export type ISignUpWithOrganizationUseCase = IPublicUseCase<
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse
>;
