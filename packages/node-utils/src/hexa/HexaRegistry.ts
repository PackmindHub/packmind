import { DataSource } from 'typeorm';
import { BaseHexa } from './BaseHexa';
import { BaseService } from './BaseService';

/**
 * Constructor type for BaseHexa subclasses.
 */
type ExtractOpts<T extends BaseHexa> =
  T extends BaseHexa<infer X, unknown> ? X : never;

type HexaConstructor<T extends BaseHexa> = new (
  dataSource: DataSource,
  opts?: Partial<ExtractOpts<T>>,
) => T;

/**
 * Registration entry for storing hexa constructors before instantiation.
 */
interface HexaRegistration<T extends BaseHexa = BaseHexa> {
  constructor: HexaConstructor<T>;
  opts?: Partial<ExtractOpts<T>>;
}

/**
 * Constructor type for BaseService subclasses.
 */
type ExtractServiceOpts<T extends BaseService> =
  T extends BaseService<infer X> ? X : never;

type ServiceConstructor<T extends BaseService> = new (
  dataSource: DataSource,
  opts?: Partial<ExtractServiceOpts<T>>,
) => T;

/**
 * Registration entry for storing service constructors before instantiation.
 */
interface ServiceRegistration<T extends BaseService = BaseService> {
  constructor: ServiceConstructor<T>;
  opts?: Partial<ExtractServiceOpts<T>>;
}

/**
 * Registry for managing the lifecycle of domain hexas and infrastructure services.
 *
 * The HexaRegistry handles registration, initialization, and cleanup of:
 * - Domain hexas (implementing port-adapter pattern)
 * - Infrastructure services (background jobs, caching, etc.)
 *
 * It ensures proper dependency management and provides a clean way to
 * access different components throughout the system.
 *
 * Usage:
 * ```typescript
 * const registry = new HexaRegistry();
 *
 * // Register hexa types and services (no instantiation yet)
 * registry.register(AccountsHexa);
 * registry.register(RecipesHexa);
 * registry.registerService(JobsService);
 *
 * // Initialize all hexas and services with shared DataSource
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 * registry.init(dataSource);
 *
 * // Use hexas and services
 * const accountsHexa = registry.get(AccountsHexa);
 * const recipesHexa = registry.get(RecipesHexa);
 * const jobsService = registry.getService(JobsService);
 * await recipesHexa.captureRecipe(...);
 * await jobsService.submitJob(...);
 * ```
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

  /**
   * Register an hexa type (deferred instantiation).
   *
   * @param constructor - Constructor function for the hexa
   * @throws Error if an hexa with the same constructor is already registered
   */
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

  /**
   * Register a service type (deferred instantiation).
   *
   * @param constructor - Constructor function for the service
   * @throws Error if a service with the same constructor is already registered
   */
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
   * Initialize all registered hexas and services by instantiating them with the provided DataSource,
   * then calling initialize(registry) on each to set up adapters and async initialization.
   * Components are created in registration order, so dependencies should be registered first.
   *
   * @param dataSource - The TypeORM DataSource that hexas and services will use for database operations
   * @throws Error if already initialized or if DataSource is not provided
   */
  public async init(dataSource: DataSource): Promise<void> {
    if (this.isInitialized) throw new Error('Registry already initialized');
    if (!dataSource)
      throw new Error('DataSource is required for initialization');

    // Store the DataSource for hexas and services to access
    this.dataSource = dataSource;

    // Mark as initialized before creating components so they can call get()/getService() during initialization
    this.isInitialized = true;

    try {
      // Instantiate all registered hexas in registration order
      for (const registration of this.registrations.values()) {
        const instance = new registration.constructor(
          dataSource,
          registration.opts,
        );
        this.hexas.set(registration.constructor, instance);
      }

      // Instantiate all registered services in registration order
      for (const registration of this.serviceRegistrations.values()) {
        const instance = new registration.constructor(
          dataSource,
          registration.opts,
        );
        this.services.set(registration.constructor, instance);
      }

      // Build port-to-hexa map by getting port name from each hexa
      // This must be done BEFORE initialization so hexas can use getAdapter() during initialize()
      for (const [, hexa] of this.hexas.entries()) {
        try {
          const portName = hexa.getPortName();
          if (portName) {
            this.portToHexaMap.set(portName, hexa);
          }
        } catch {
          // Hexa doesn't expose a port (getPortName throws an error)
          // This is fine - not all hexas need to expose adapters
          continue;
        }
      }

      // Initialize all hexas with registry access for adapter retrieval
      for (const hexa of this.hexas.values()) {
        await hexa.initialize(this);
      }

      // Initialize all services with registry access
      for (const service of this.services.values()) {
        await service.initialize(this);
      }

      // Post-initialization: Set deployment port on RecipesHexa if both are available
      // This needs to happen after all hexas are initialized to avoid circular dependencies
      try {
        // Find RecipesHexa and DeploymentsHexa by iterating through registered hexas
        let recipesHexa: BaseHexa | undefined;
        let deploymentsHexa: BaseHexa | undefined;

        for (const [constructor, hexa] of this.hexas.entries()) {
          if (constructor.name === 'RecipesHexa') {
            recipesHexa = hexa;
          } else if (constructor.name === 'DeploymentsHexa') {
            deploymentsHexa = hexa;
          }
        }

        if (recipesHexa && deploymentsHexa) {
          // Check if RecipesHexa has setDeploymentPort method (it's a special case for delayed jobs)
          const recipesHexaWithMethod = recipesHexa as unknown as {
            setDeploymentPort?: (
              registry: HexaRegistry,
              port: unknown,
            ) => Promise<void>;
          };
          if (typeof recipesHexaWithMethod.setDeploymentPort === 'function') {
            const deploymentPort = deploymentsHexa.getAdapter();
            await recipesHexaWithMethod.setDeploymentPort(this, deploymentPort);
          }
        }
      } catch {
        // RecipesHexa or DeploymentsHexa not available - this is fine
        // Some test setups might not have both hexas registered
      }
    } catch (error) {
      // If initialization fails, reset the state
      this.isInitialized = false;
      this.dataSource = null;
      this.hexas.clear();
      this.services.clear();
      this.portToHexaMap.clear();
      throw error;
    }
  }

  /**
   * @deprecated This method is no longer needed. Initialization is now handled in init().
   * This method is kept for backward compatibility but does nothing.
   */
  public async initAsync(): Promise<void> {
    // No-op: initialization is now handled in init()
  }

  /**
   * Get a registered and initialized hexa by its constructor.
   *
   * @param constructor - The constructor of the hexa
   * @returns The hexa instance
   * @throws Error if the hexa is not registered or not yet instantiated
   */
  public get<T extends BaseHexa>(constructor: HexaConstructor<T>): T {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    const hexa = this.hexas.get(constructor);
    if (!hexa) {
      // Check if it's registered but not yet instantiated
      if (this.registrations.has(constructor)) {
        throw new Error(
          `Hexa ${constructor.name} is registered but not yet instantiated. Ensure dependencies are registered in the correct order.`,
        );
      }
      throw new Error(`Hexa ${constructor.name} not registered`);
    }
    return hexa as T;
  }

  /**
   * Get a registered and initialized service by its constructor.
   *
   * @param constructor - The constructor of the service
   * @returns The service instance
   * @throws Error if the service is not registered or not yet instantiated
   */
  public getService<T extends BaseService>(
    constructor: ServiceConstructor<T>,
  ): T {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    const service = this.services.get(constructor);
    if (!service) {
      // Check if it's registered but not yet instantiated
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
   * Get a registered and initialized hexa by its class name.
   * Use this method only when direct imports would create circular dependencies.
   * Prefer using get() with the constructor class when possible.
   *
   * @param className - The name of the hexa class (e.g., 'LinterHexa')
   * @returns The hexa instance or undefined if not found
   */
  public getByName<T extends BaseHexa = BaseHexa>(
    className: string,
  ): T | undefined {
    if (!this.isInitialized)
      throw new Error('Registry not initialized. Call init() first.');

    for (const [constructor, hexa] of this.hexas.entries()) {
      if (constructor.name === className) {
        return hexa as T;
      }
    }
    return undefined;
  }

  /**
   * Get an adapter by its port type.
   * This method allows retrieving adapters without importing the hexa class,
   * which helps avoid circular dependencies.
   * The caller must specify the port type as a generic parameter and pass the port name constant.
   *
   * @template T - The port type (e.g., IGitPort, IDeploymentPort)
   * @param portTypeName - The port name constant (e.g., IGitPortName from @packmind/types)
   * @returns The adapter instance implementing the port type
   * @throws Error if registry is not initialized or if no hexa provides the requested port type
   *
   * @example
   * ```typescript
   * import { IGitPortName } from '@packmind/types';
   * import type { IGitPort } from '@packmind/types';
   * const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
   * ```
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
      // If the error indicates the hexa isn't initialized yet, provide a more helpful message
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

  /**
   * Get the DataSource used by this registry.
   *
   * @returns The DataSource instance
   * @throws Error if registry is not initialized
   */
  public getDataSource(): DataSource {
    if (!this.isInitialized || !this.dataSource) {
      throw new Error(
        'Registry not initialized. Call init() with a DataSource first.',
      );
    }
    return this.dataSource;
  }

  /**
   * Check if an hexa type is registered (regardless of initialization status).
   *
   * @param constructor - The constructor of the hexa
   * @returns True if the hexa type is registered
   */
  public isRegistered<T extends BaseHexa>(
    constructor: HexaConstructor<T>,
  ): boolean {
    return this.registrations.has(constructor);
  }

  /**
   * Check if the registry has been initialized.
   *
   * @returns True if init() has been called
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Destroy all initialized hexas and services, cleaning up resources.
   * Each hexa's and service's destroy method will be called.
   * This also resets the registry to allow re-initialization.
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

  /**
   * Clear all registrations, hexas, and services (complete reset).
   * Useful for testing or complete reinitialization.
   */
  public reset(): void {
    this.destroyAll();
    this.registrations.clear();
    this.serviceRegistrations.clear();
  }
}
