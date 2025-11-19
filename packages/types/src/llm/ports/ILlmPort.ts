import { AIService } from '../AIService';
import { OrganizationId } from '../../accounts/Organization';

export const ILlmPortName = 'ILlmPort' as const;

export interface ILlmPort {
  getLlmForOrganization(organizationId: OrganizationId): Promise<AIService>;
}
