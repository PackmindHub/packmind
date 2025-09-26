import { User, UserId, UserOrganizationRole } from '../entities/User';
import { Organization, OrganizationId } from '../entities/Organization';
import { IPublicUseCase } from '@packmind/shared';

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
