import { IPublicUseCase } from '../../UseCase';
import { User, Organization, SocialProvider } from '../index';

export type SignUpWithOrganizationCommand = {
  email: string;
  password?: string;
  authType: 'password' | 'social';
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
