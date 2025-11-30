import { UserId } from '../User';
import { OrganizationId } from '../Organization';
import { IUseCase } from '../../UseCase';

export type GetMcpUrlCommand = {
  userId: UserId;
  organizationId: OrganizationId;
};

export type GetMcpUrlResponse = {
  url: string;
};

export type IGetMcpUrlUseCase = IUseCase<GetMcpUrlCommand, GetMcpUrlResponse>;
