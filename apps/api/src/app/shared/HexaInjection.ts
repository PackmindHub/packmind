import { Inject } from '@nestjs/common';
import { HEXA_REGISTRY_TOKEN } from './HexaRegistryModule';

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
