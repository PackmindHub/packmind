import { Organization } from '../Organization';
import { User, UserOrganizationRole } from '../User';

export type McpTokenPayload = {
  user: User;
  organization: Organization;
  role: UserOrganizationRole;
};

export type McpTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export const IMcpTokenServiceName = 'IMcpTokenService' as const;

export interface IMcpTokenService {
  generateToken(payload: McpTokenPayload): McpTokenResponse;
  getMcpUrl(): string;
}
