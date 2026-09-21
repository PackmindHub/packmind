import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import type { HexaRegistry } from './HexaRegistry';

export type BaseServiceOpts = { logger: PackmindLogger };

/**
 * Base class for infrastructure that needs the registry's lifecycle but is not
 * a domain: `JobsService` and `PackmindEventEmitterService` are the two.
 * Services expose no port and no cross-domain contract.
 */
export abstract class BaseService<T extends BaseServiceOpts = BaseServiceOpts> {
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly opts?: Partial<T>,
    protected readonly logger: PackmindLogger = opts?.logger ??
      new PackmindLogger('BaseService'),
  ) {}

  /**
   * Runs after everything is constructed and, crucially, before any hexa's
   * initialize(). A hexa may therefore rely on a service being initialized;
   * a service must not rely on a hexa being so.
   */
  abstract initialize(registry: HexaRegistry): Promise<void>;

  /** Called by HexaRegistry.destroyAll(); close connections and queues here. */
  abstract destroy(): void;
}
