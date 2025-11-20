import { ISystemUseCase, SystemPackmindCommand } from '../../UseCase';
import { AIService } from '../AIService';
import { OrganizationId } from '../../accounts/Organization';

export type GetAiServiceForOrganizationCommand = SystemPackmindCommand & {
  organizationId: OrganizationId;
};

export type GetAiServiceForOrganizationResponse = {
  aiService: AIService | undefined;
};

export type IGetAiServiceForOrganizationUseCase = ISystemUseCase<
  GetAiServiceForOrganizationCommand,
  GetAiServiceForOrganizationResponse
>;
