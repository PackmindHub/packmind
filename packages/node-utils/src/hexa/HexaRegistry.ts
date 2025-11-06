import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

/**
 * Constructor type for BaseHexa subclasses.
 */
type ExtractOpts<T extends BaseHexa> = T extends BaseHexa<infer X> ? X : never;

type HexaConstructor<T extends BaseHexa> = new (
  registry: HexaRegistry,
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
 * Registry for managing the lifecycle of domain hexalications.
 *
 * The HexaRegistry handles registration, initialization, and cleanup of all domain hexas.
 * It ensures proper dependency management between hexas and provides a clean way to
 * access different domain hexalications throughout the system.
 *
 * Usage:
 * ```typescript
 * const registry = new HexaRegistry();
 *
 * // Register hexa types (no instantiation yet)
 * registry.register(AccountsHexa);
 * registry.register(RecipesHexa);
 *
 * // Initialize all hexas with shared DataSource
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 * registry.init(dataSource);
 *
 * // Use hexas
 * const accountsHexa = registry.get(AccountsHexa);
 * const recipesHexa = registry.get(RecipesHexa);
 * await recipesHexa.captureRecipe(...);
 * ```
 */
export class HexaRegistry {
  private readonly registrations = new Map<
    HexaConstructor<BaseHexa>,
    HexaRegistration
  >();
  private readonly hexas = new Map<HexaConstructor<BaseHexa>, BaseHexa>();
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
   * Initialize all registered hexas by instantiating them with the provided DataSource.
   * Hexas are created in registration order, so dependencies should be registered first.
   *
   * NOTE: This is synchronous and only calls constructors. If any hexa has an async
   * initialize() method, you must call initAsync() afterwards.
   *
   * @param dataSource - The TypeORM DataSource that hexas will use for database operations
   * @throws Error if already initialized or if DataSource is not provided
   */
  public init(dataSource: DataSource): void {
    if (this.isInitialized) throw new Error('Registry already initialized');
    if (!dataSource)
      throw new Error('DataSource is required for initialization');

    // Store the DataSource for hexas to access
    this.dataSource = dataSource;

    // Mark as initialized before creating hexas so they can call get() during construction
    this.isInitialized = true;

    try {
      // Instantiate all registered hexas in registration order
      for (const registration of this.registrations.values()) {
        const instance = new registration.constructor(this, registration.opts);
        this.hexas.set(registration.constructor, instance);
      }
    } catch (error) {
      // If initialization fails, reset the state
      this.isInitialized = false;
      this.dataSource = null;
      this.hexas.clear();
      throw error;
    }
  }

  /**
   * Call async initialize() method on all hexas that have one.
   * This should be called after init() if any hexas require async initialization.
   *
   * Hexas that have an initialize() method will have it called in registration order.
   * Hexas without an initialize() method are silently skipped.
   *
   * @throws Error if init() has not been called first
   */
  public async initAsync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Registry not initialized. Call init() first.');
    }

    // Call initialize() on each hexa that has the method
    for (const hexa of this.hexas.values()) {
      if (hexa.initialize) {
        await hexa.initialize();
      }
    }
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
   * Get a registered and initialized hexa by its class name.
   * Useful for avoiding circular dependencies when you can't import the class.
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
   * Destroy all initialized hexas and clean up resources.
   * Each hexa's destroy method will be called.
   * This also resets the registry to allow re-initialization.
   */
  public destroyAll(): void {
    for (const hexa of this.hexas.values()) {
      hexa.destroy();
    }
    this.hexas.clear();
    this.dataSource = null;
    this.isInitialized = false;
  }

  /**
   * Clear all registrations and hexas (complete reset).
   * Useful for testing or complete reinitialization.
   */
  public reset(): void {
    this.destroyAll();
    this.registrations.clear();
  }
}

/**
 * Base class for all domain applications.
 *
 * This class serves as the foundation for domain-specific App classes that act as
 * facades for their respective use cases. Each domain app should extend this class
 * and implement the required lifecycle methods.
 *
 * The App classes hold the Hexa instance and serve as a clean facade for use cases,
 * while the Hexa classes focus on dependency injection and service instantiation.
 */

export type BaseHexaOpts = { logger: PackmindLogger };

export abstract class BaseHexa<T extends BaseHexaOpts = BaseHexaOpts> {
  protected readonly logger: PackmindLogger;

  /**
   * Create the app with access to the app registry.
   * Dependencies can be resolved immediately in the constructor, eliminating
   * the need for nullable properties.
   *
   * @param registry - The app registry instance for accessing other apps
   * @param opts - the options to create the Hexa
   */
  constructor(
    protected readonly registry: HexaRegistry,
    protected readonly opts?: Partial<T>,
  ) {
    this.logger = opts?.logger ?? new PackmindLogger('BaseHexa');
  }

  /**
   * Optional async initialization phase.
   * Override this method if your hexa requires async initialization
   * (e.g., setting up job queues, external connections, etc.).
   *
   * This will be called by HexaRegistry.initAsync() after all hexas
   * have been constructed.
   */
  async initialize?(): Promise<void>;

  /**
   * Clean up resources when the app is being destroyed.
   * This method should handle any cleanup logic like closing connections,
   * clearing caches, etc.
   */
  abstract destroy(): void;
}
