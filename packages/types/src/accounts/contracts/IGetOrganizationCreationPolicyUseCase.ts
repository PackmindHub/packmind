import { UserId } from '../User';
import { IPublicUseCase } from '../../UseCase';

export type GetOrganizationCreationPolicyCommand = {
  // Omitted for an anonymous caller (sign-up screen).
  userId?: UserId;
};

export type GetOrganizationCreationPolicyResponse = {
  canCreateOrganization: boolean;
};

export type IGetOrganizationCreationPolicyUseCase = IPublicUseCase<
  GetOrganizationCreationPolicyCommand,
  GetOrganizationCreationPolicyResponse
>;
