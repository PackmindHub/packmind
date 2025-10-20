import { IUseCase, PackmindCommand, PackmindResult } from '@packmind/shared';
import { UserId } from '../entities/User';
import { OrganizationId } from '../entities/Organization';

export type GenerateApiKeyCommand = PackmindCommand & {
  userId: UserId;
  organizationId: OrganizationId;
};

export type GenerateApiKeyResponse = PackmindResult & {
  apiKey: string;
  expiresAt: Date;
};

export type IGenerateApiKeyUseCase = IUseCase<
  GenerateApiKeyCommand,
  GenerateApiKeyResponse
>;
