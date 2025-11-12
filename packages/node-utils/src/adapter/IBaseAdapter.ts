/**
 * Base interface that all domain adapters must implement.
 *
 * This interface standardizes adapter initialization and provides
 * health check capabilities across all domains.
 *
 * @template TPort - The port interface this adapter implements (e.g., IGitPort, IAccountsPort)
 *
 * @example
 * ```typescript
 * export class RecipesAdapter implements IBaseAdapter<IRecipesPort>, IRecipesPort {
 *   private gitPort: IGitPort | null = null;
 *   private accountsPort: IAccountsPort | null = null;
 *   private _updateRecipesFromGitHub!: UpdateRecipesFromGitHubUsecase;
 *
 *   public initialize(ports: {
 *     [IGitPortName]: IGitPort;
 *     [IAccountsPortName]: IAccountsPort;
 *   }): void {
 *     this.gitPort = ports[IGitPortName];
 *     this.accountsPort = ports[IAccountsPortName];
 *
 *     if (!this.isReady()) {
 *       throw new Error('RecipesAdapter: Required ports not provided');
 *     }
 *
 *     // Create use cases with non-null ports
 *     this._updateRecipesFromGitHub = new UpdateRecipesFromGitHubUsecase(
 *       this.services.getRecipeService(),
 *       this.gitPort,
 *     );
 *   }
 *
 *   public isReady(): boolean {
 *     return this.gitPort !== null && this.accountsPort !== null;
 *   }
 *
 *   public getPort(): IRecipesPort {
 *     return this as IRecipesPort;
 *   }
 * }
 * ```
 */
export interface IBaseAdapter<TPort = void> {
  /**
   * Initialize the adapter with required ports from the registry.
   *
   * Each adapter should explicitly type the ports parameter to document
   * its dependencies. All ports in the signature are REQUIRED - adapters
   * should not declare ports they don't need.
   *
   * This method should:
   * 1. Set all port properties from the ports parameter
   * 2. Validate all required ports are set using isReady()
   * 3. Create all use cases with non-null ports
   *
   * @param ports - Record of port names to port instances
   * @throws Error if required ports are not provided
   *
   * @example
   * ```typescript
   * public initialize(ports: {
   *   [IGitPortName]: IGitPort;           // Required
   *   [IAccountsPortName]: IAccountsPort; // Required
   * }): void {
   *   this.gitPort = ports[IGitPortName];
   *   this.accountsPort = ports[IAccountsPortName];
   *
   *   if (!this.isReady()) {
   *     throw new Error('RecipesAdapter: Required ports not provided');
   *   }
   *
   *   this._someUseCase = new SomeUseCase(this.services, this.gitPort);
   * }
   * ```
   */
  initialize(ports: Record<string, unknown>): void;

  /**
   * Check if the adapter is ready to use.
   *
   * Returns true only if all required ports are properly set (non-null).
   * This is used by initialize() to validate dependencies before creating
   * use cases, and can be used for health checks.
   *
   * @returns true if all required ports are non-null, false otherwise
   *
   * @example
   * ```typescript
   * public isReady(): boolean {
   *   return this.gitPort !== null && this.accountsPort !== null;
   * }
   * ```
   */
  isReady(): boolean;

  /**
   * Get the port interface this adapter implements.
   *
   * Used by Hexa.getAdapter() to expose the business interface to other domains.
   * Typically returns `this as TPort`.
   *
   * @returns The port implementation (the adapter itself typed as the port interface)
   *
   * @example
   * ```typescript
   * public getPort(): IRecipesPort {
   *   return this as IRecipesPort;
   * }
   * ```
   */
  getPort(): TPort;
}
