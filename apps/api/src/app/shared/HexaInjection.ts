import { Inject } from '@nestjs/common';
import {
  HEXA_REGISTRY_TOKEN,
  ACCOUNTS_ADAPTER_TOKEN,
  DEPLOYMENT_ADAPTER_TOKEN,
  RECIPES_ADAPTER_TOKEN,
  STANDARDS_ADAPTER_TOKEN,
  GIT_ADAPTER_TOKEN,
  SPACES_ADAPTER_TOKEN,
  LINTER_ADAPTER_TOKEN,
  CODING_AGENT_ADAPTER_TOKEN,
  LEARNINGS_ADAPTER_TOKEN,
} from './HexaRegistryModule';

/**
 * Decorator to inject the HexaRegistry instance
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(@InjectHexaRegistry() private readonly registry: HexaRegistry) {}
 * }
 * ```
 */
export const InjectHexaRegistry = () => Inject(HEXA_REGISTRY_TOKEN);

/**
 * Type helper for creating hexa injection decorators
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HexaConstructor<T> = new (...args: any[]) => T;

/**
 * Creates a typed injection decorator for a specific hexa
 *
 * Usage:
 * ```typescript
 * const InjectAccountsHexa = createHexaInjector(AccountsHexa);
 *
 * @Injectable()
 * export class UserController {
 *   constructor(@InjectAccountsHexa() private readonly accountsHexa: AccountsHexa) {}
 * }
 * ```
 */
export function createHexaInjector<T>(HexaClass: HexaConstructor<T>) {
  return () => Inject(HexaClass);
}

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
export const InjectRecipesAdapter = () => Inject(RECIPES_ADAPTER_TOKEN);
export const InjectStandardsAdapter = () => Inject(STANDARDS_ADAPTER_TOKEN);
export const InjectGitAdapter = () => Inject(GIT_ADAPTER_TOKEN);
export const InjectSpacesAdapter = () => Inject(SPACES_ADAPTER_TOKEN);
export const InjectLinterAdapter = () => Inject(LINTER_ADAPTER_TOKEN);
export const InjectCodingAgentAdapter = () =>
  Inject(CODING_AGENT_ADAPTER_TOKEN);
export const InjectLearningsAdapter = () => Inject(LEARNINGS_ADAPTER_TOKEN);
