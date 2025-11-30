import { UserId } from '../User';
import { OrganizationId } from '../Organization';
import { IUseCase } from '../../UseCase';

export type GetMcpTokenCommand = {
  userId: UserId;
  organizationId: OrganizationId;
};

export type GetMcpTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type IGetMcpTokenUseCase = IUseCase<
  GetMcpTokenCommand,
  GetMcpTokenResponse
>;
