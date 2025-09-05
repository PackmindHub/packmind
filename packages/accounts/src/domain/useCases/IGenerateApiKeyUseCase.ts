import { IPublicUseCase } from '@packmind/shared';
import { UserId } from '../entities/User';
import { OrganizationId } from '../entities/Organization';

export type GenerateApiKeyCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  host: string;
};

export type GenerateApiKeyResponse = {
  apiKey: string;
  expiresAt: Date;
};

export type IGenerateApiKeyUseCase = IPublicUseCase<
  GenerateApiKeyCommand,
  GenerateApiKeyResponse
>;
