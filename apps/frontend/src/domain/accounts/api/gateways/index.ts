import { IOrganizationGateway } from './IOrganizationGateway';
import { OrganizationGatewayApi } from './OrganizationGatewayApi';
import { IUserGateway } from './IUserGateway';
import { UserGatewayApi } from './UserGatewayApi';
import {
  IAuthGateway,
  TokenResponse,
  ValidateInvitationResponse,
} from './IAuthGateway';
import { AuthGatewayApi } from './AuthGatewayApi';

export const organizationGateway: IOrganizationGateway =
  new OrganizationGatewayApi();
export const userGateway: IUserGateway = new UserGatewayApi();
export const authGateway: IAuthGateway = new AuthGatewayApi();

export type { TokenResponse, ValidateInvitationResponse };
