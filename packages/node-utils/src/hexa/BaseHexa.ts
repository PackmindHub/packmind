import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import type { HexaRegistry } from './HexaRegistry';

export type BaseHexaOpts = { logger: PackmindLogger };

/**
 * Base class for every domain's `<Name>Hexa`: the façade a domain exposes, and
 * the owner of its services, repositories and adapter.
 */
export abstract class BaseHexa<
  T extends BaseHexaOpts = BaseHexaOpts,
  TPort = void,
> {
  /**
   * Build repositories and services here. The registry is deliberately not a
   * parameter, so anything cross-domain has to wait for initialize().
   */
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly opts?: Partial<T>,
    protected readonly logger: PackmindLogger = opts?.logger ??
      new PackmindLogger('BaseHexa'),
  ) {}

  /**
   * Runs once every hexa has been constructed, which is what makes other
   * domains' adapters safe to resolve from the registry here. Async work such
   * as queue setup belongs here too.
   */
  abstract initialize(registry: HexaRegistry): Promise<void>;

  abstract getAdapter(): TPort;

  /**
   * The port name constant from @packmind/types, e.g. `IGitPortName`. A hexa
   * that exposes no adapter must THROW here rather than return a placeholder:
   * HexaRegistry.init() catches that throw and simply leaves the hexa out of
   * its port map.
   */
  abstract getPortName(): string;

  /** Called by HexaRegistry.destroyAll(); close connections and timers here. */
  abstract destroy(): void;
}
