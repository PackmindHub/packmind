import { RagLabConfigurationId } from './RagLabConfigurationId';
import { OrganizationId } from '../accounts/Organization';

export type RagLabConfiguration = {
  id: RagLabConfigurationId;
  organizationId: OrganizationId;
  embeddingModel: string;
  embeddingDimensions: number;
  includeCodeBlocks: boolean;
  maxTextLength: number | null;
};

export const DEFAULT_RAG_LAB_CONFIGURATION: Omit<
  RagLabConfiguration,
  'id' | 'organizationId'
> = {
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  includeCodeBlocks: false,
  maxTextLength: null,
};
