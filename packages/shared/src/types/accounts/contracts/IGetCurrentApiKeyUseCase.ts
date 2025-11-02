import { IPublicUseCase } from '../../UseCase';
import { UserId } from '../User';

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
