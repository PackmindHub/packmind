import { User, UserId, UserOrganizationRole } from '../User';
import { Organization, OrganizationId } from '../Organization';
import { IPublicUseCase } from '../../UseCase';

export type GenerateUserTokenCommand = {
  userId: UserId;
  organizationId: OrganizationId;
};

export type GenerateUserTokenResponse = {
  user: User;
  organization: Organization;
  role: UserOrganizationRole;
};

export type IGenerateUserTokenUseCase = IPublicUseCase<
  GenerateUserTokenCommand,
  GenerateUserTokenResponse
>;
