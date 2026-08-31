import { Inject } from '@nestjs/common';
import {
  ACCOUNTS_ADAPTER_TOKEN,
  DEPLOYMENT_ADAPTER_TOKEN,
  RECIPES_ADAPTER_TOKEN,
  GIT_ADAPTER_TOKEN,
  SPACES_ADAPTER_TOKEN,
  MARKETPLACES_ADAPTER_TOKEN,
  PLAYBOOK_CHANGE_APPLIER_ADAPTER_TOKEN,
} from './HexaRegistryModule';
/**
 * Adapter injection decorators
 * These decorators inject adapter interfaces (ports) instead of hexa classes.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(@InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort) {}
 * }
 * ```
 */

export const InjectAccountsAdapter = () => Inject(ACCOUNTS_ADAPTER_TOKEN);
export const InjectDeploymentAdapter = () => Inject(DEPLOYMENT_ADAPTER_TOKEN);
export const InjectCommandsAdapter = () => Inject(RECIPES_ADAPTER_TOKEN);
export const InjectGitAdapter = () => Inject(GIT_ADAPTER_TOKEN);
export const InjectSpacesAdapter = () => Inject(SPACES_ADAPTER_TOKEN);
export const InjectMarketplacesAdapter = () =>
  Inject(MARKETPLACES_ADAPTER_TOKEN);
export const InjectPlaybookChangeApplierAdapter = () =>
  Inject(PLAYBOOK_CHANGE_APPLIER_ADAPTER_TOKEN);
