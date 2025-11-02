import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';

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
