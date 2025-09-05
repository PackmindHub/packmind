import { UserId } from '../entities/User';
import { User } from '../entities/User';
import { Organization } from '../entities/Organization';
import { IPublicUseCase } from '@packmind/shared';

export type GenerateUserTokenCommand = {
  userId: UserId;
};

export type GenerateUserTokenResponse = {
  user: User;
  organization: Organization;
};

export type IGenerateUserTokenUseCase = IPublicUseCase<
  GenerateUserTokenCommand,
  GenerateUserTokenResponse
>;
