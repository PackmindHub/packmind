import { DataSource } from 'typeorm';
import { BaseHexa } from './BaseHexa';
import { BaseService } from './BaseService';

type ExtractOpts<T extends BaseHexa> =
  T extends BaseHexa<infer X, unknown> ? X : never;

type HexaConstructor<T extends BaseHexa> = new (
  dataSource: DataSource,
  opts?: Partial<ExtractOpts<T>>,
) => T;

interface HexaRegistration<T extends BaseHexa = BaseHexa> {
  constructor: HexaConstructor<T>;
  opts?: Partial<ExtractOpts<T>>;
}

type ExtractServiceOpts<T extends BaseService> =
  T extends BaseService<infer X> ? X : never;

type ServiceConstructor<T extends BaseService> = new (
  dataSource: DataSource,
  opts?: Partial<ExtractServiceOpts<T>>,
) => T;

interface ServiceRegistration<T extends BaseService = BaseService> {
  constructor: ServiceConstructor<T>;
  opts?: Partial<ExtractServiceOpts<T>>;
}

/**
 * Lifecycle owner for domain hexas and infrastructure services.
 *
 * Registration is separate from instantiation: `register`/`registerService`
 * only record constructors, and `init(dataSource)` builds and initializes
 * everything in registration order against one shared DataSource.
 */
export class HexaRegistry {
  private readonly registrations = new Map<
    HexaConstructor<BaseHexa>,
    HexaRegistration
  >();
  private readonly hexas = new Map<HexaConstructor<BaseHexa>, BaseHexa>();
  private readonly portToHexaMap = new Map<string, BaseHexa>();
  private readonly serviceRegistrations = new Map<
    ServiceConstructor<BaseService>,
    ServiceRegistration
  >();
  private readonly services = new Map<
    ServiceConstructor<BaseService>,
    BaseService
  >();
  private isInitialized = false;
  private dataSource: DataSource | null = null;

  public register<T extends BaseHexa>(
    constructor: HexaConstructor<T>,
    opts?: Partial<ExtractOpts<T>>,
  ): void {
    if (this.registrations.has(constructor))
      throw new Error(`Hexa ${constructor.name} already registered`);
    if (this.isInitialized)
      throw new Error('Cannot register hexas after initialization');

    this.registrations.set(constructor, { constructor, opts });
  }

  public registerService<T extends BaseService>(
    constructor: ServiceConstructor<T>,
    opts?: Partial<ExtractServiceOpts<T>>,
  ): void {
    if (this.serviceRegistrations.has(constructor))
      throw new Error(`Service ${constructor.name} already registered`);
    if (this.isInitialized)
      throw new Error('Cannot register services after initialization');

    this.serviceRegistrations.set(constructor, { constructor, opts });
  }

  /**
   * Instantiate every registration, then `initialize(registry)` each one.
   * Construction follows registration order, so a hexa that another depends on
   * at construction time must be registered first.
   */
  public async init(dataSource: DataSource): Promise<void> {
    if (this.isInitialized) throw new Error('Registry already initialized');
    if (!dataSource)
      throw new Error('DataSource is required for initialization');

    this.dataSource = dataSource;

    // Set before creating components, so they can call get()/getService() on
    // the registry from their own constructors and initialize().
    this.isInitialized = true;

    try {
      for (const registration of this.registrations.values()) {
        const instance = new registration.constructor(
          dataSource,
          registration.opts,
        );
        this.hexas.set(registration.constructor, instance);
      }

      for (const registration of this.serviceRegistrations.values()) {
        const instance = new registration.constructor(
          dataSource,
          registration.opts,
        );
        this.services.set(registration.constructor, instance);
      }

      // The port map has to be complete before any initialize() runs, since
      // that is when hexas resolve each other through getAdapter().
      for (const [, hexa] of this.hexas.entries()) {
        try {
          const portName = hexa.getPortName();
          if (portName) {
            this.portToHexaMap.set(portName, hexa);
          }
        } catch {
          // getPortName() throws for hexas that expose no adapter at all.
          continue;
        }
      }

      for (const service of this.services.values()) {
        await service.initialize(this);
      }

      for (const hexa of this.hexas.values()) {
        await hexa.initialize(this);
      }
    } catch (error) {
      this.isInitialized = false;
      this.dataSource = null;
      this.hexas.clear();
      this.services.clear();
      this.portToHexaMap.clear();
      throw error;
    }
  }

  public get<T extends BaseHexa>(constructor: HexaConstructor<T>): T {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    const hexa = this.hexas.get(constructor);
    if (!hexa) {
      if (this.registrations.has(constructor)) {
        throw new Error(
          `Hexa ${constructor.name} is registered but not yet instantiated. Ensure dependencies are registered in the correct order.`,
        );
      }
      throw new Error(`Hexa ${constructor.name} not registered`);
    }
    return hexa as T;
  }

  public getService<T extends BaseService>(
    constructor: ServiceConstructor<T>,
  ): T {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    const service = this.services.get(constructor);
    if (!service) {
      if (this.serviceRegistrations.has(constructor)) {
        throw new Error(
          `Service ${constructor.name} is registered but not yet instantiated. Ensure dependencies are registered in the correct order.`,
        );
      }
      throw new Error(`Service ${constructor.name} not registered`);
    }
    return service as T;
  }

  /**
   * Look up an adapter by port name rather than by hexa class, so a consumer
   * never has to import the providing hexa — that import is what would close a
   * dependency cycle between two domains.
   */
  public getAdapter<T>(portTypeName: string): T {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    const hexa = this.portToHexaMap.get(portTypeName);
    if (!hexa) {
      throw new Error(
        `No hexa found for port type: ${portTypeName}. Ensure the corresponding hexa is registered.`,
      );
    }

    try {
      const adapter = hexa.getAdapter();
      return adapter as T;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('not initialized') ||
        errorMessage.includes('not available')
      ) {
        throw new Error(
          `Adapter for ${portTypeName} is not available yet. The hexa may not be initialized. Original error: ${errorMessage}`,
        );
      }
      throw new Error(
        `Failed to get adapter for ${portTypeName}: ${errorMessage}`,
      );
    }
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Destroy every instance and clear the registry's state. Registrations
   * themselves are kept, so `init()` can be called again afterwards.
   */
  public destroyAll(): void {
    for (const hexa of this.hexas.values()) {
      hexa.destroy();
    }
    for (const service of this.services.values()) {
      service.destroy();
    }
    this.hexas.clear();
    this.services.clear();
    this.portToHexaMap.clear();
    this.dataSource = null;
    this.isInitialized = false;
  }
}
