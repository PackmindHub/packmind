import { IOrganizationGateway } from './IOrganizationGateway';
import { OrganizationGatewayApi } from './OrganizationGatewayApi';
import { IUserGateway } from './IUserGateway';
import { UserGatewayApi } from './UserGatewayApi';
import {
  IAuthGateway,
  TokenResponse,
  ValidateInvitationResponse,
  ValidatePasswordResetResponse,
} from './IAuthGateway';
import { AuthGatewayApi } from './AuthGatewayApi';
import {
  GetActivationTokenCommand,
  GetActivationTokenResponse,
  ITrialGateway,
} from './ITrialGateway';
import { TrialGatewayApi } from './TrialGatewayApi';

export const organizationGateway: IOrganizationGateway =
  new OrganizationGatewayApi();
export const userGateway: IUserGateway = new UserGatewayApi();
export const authGateway: IAuthGateway = new AuthGatewayApi();
export const trialGateway: ITrialGateway = new TrialGatewayApi();

export type {
  TokenResponse,
  ValidateInvitationResponse,
  ValidatePasswordResetResponse,
  GetActivationTokenCommand,
  GetActivationTokenResponse,
};
