/**
 * Base interface that all domain adapters must implement.
 *
 * Implementations declare their dependencies by narrowing the `ports` parameter
 * to the exact port names they need, rather than accepting the wide
 * `Record<string, unknown>` of the base signature.
 */
export interface IBaseAdapter<TPort = void> {
  /**
   * Initialize the adapter with the ports the registry resolved for it.
   *
   * Besides wiring ports and building use cases, implementations must call
   * `instrumentUseCases(this)` here. A use case has no base class to instrument
   * it the way repositories and services have, so the adapter is the only seam,
   * and nothing fails at runtime when the call is missing — the traces just stop
   * one level short, silently. `instrumentUseCases.arch.spec.ts` in this package
   * is what catches an omission.
   */
  initialize(ports: Record<string, unknown>): Promise<void>;

  /** Whether every port this adapter requires has been set (non-null). */
  isReady(): boolean;

  /**
   * The business interface other domains see. Each domain's Hexa returns this
   * from its own `getAdapter()`; implementations typically return `this`.
   */
  getPort(): TPort;
}
