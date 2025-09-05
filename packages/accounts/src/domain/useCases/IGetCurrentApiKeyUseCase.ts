import { IPublicUseCase } from '@packmind/shared';
import { UserId } from '../entities/User';

export type GetCurrentApiKeyCommand = {
  userId: UserId;
};

export type GetCurrentApiKeyResponse = {
  hasApiKey: boolean;
  expiresAt?: Date;
};

export type IGetCurrentApiKeyUseCase = IPublicUseCase<
  GetCurrentApiKeyCommand,
  GetCurrentApiKeyResponse
>;
