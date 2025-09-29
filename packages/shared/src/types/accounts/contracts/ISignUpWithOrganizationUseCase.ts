import { IPublicUseCase } from '../../UseCase';
import { User, Organization } from '../index';

export type SignUpWithOrganizationCommand = {
  organizationName: string;
  email: string;
  password: string;
};

export type SignUpWithOrganizationResponse = {
  user: User;
  organization: Organization;
};

export type ISignUpWithOrganizationUseCase = IPublicUseCase<
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse
>;
