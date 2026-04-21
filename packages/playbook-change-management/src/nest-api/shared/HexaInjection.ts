import { Inject } from '@nestjs/common';

/**
 * Token strings must match those in apps/api/src/app/shared/HexaRegistryModule.ts
 */
const PLAYBOOK_CHANGE_MANAGEMENT_ADAPTER_TOKEN =
  'PLAYBOOK_CHANGE_MANAGEMENT_ADAPTER';
const CODING_AGENT_ADAPTER_TOKEN = 'CODING_AGENT_ADAPTER';

export const InjectPlaybookChangeManagementAdapter = () =>
  Inject(PLAYBOOK_CHANGE_MANAGEMENT_ADAPTER_TOKEN);
export const InjectCodingAgentAdapter = () =>
  Inject(CODING_AGENT_ADAPTER_TOKEN);
