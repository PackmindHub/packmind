import { PackmindEvent, PackmindEventClass } from '@packmind/types';
import { PackmindEventEmitterService } from './PackmindEventEmitterService';

/**
 * Base class for domain event listeners: a hexa reacts to another domain's
 * events through one of these instead of depending on that domain directly.
 * The listener acts through its own hexa's adapter, which it is given on
 * construction.
 *
 * See packages/deployments/src/application/listeners for real subclasses.
 */
export abstract class PackmindListener<TAdapter> {
  protected eventEmitterService!: PackmindEventEmitterService;

  constructor(protected readonly adapter: TAdapter) {}

  /** Called by the owning hexa during its own initialization. */
  initialize(eventEmitterService: PackmindEventEmitterService): void {
    this.eventEmitterService = eventEmitterService;
    this.registerHandlers();
  }

  /** Subscriptions go here, via `subscribe()`. */
  protected abstract registerHandlers(): void;

  /**
   * Binds the handler to the listener before registering it, so a handler
   * written as a plain method still reaches `this.adapter`.
   */
  protected subscribe<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): void {
    this.eventEmitterService.on(eventClass, handler.bind(this));
  }

  /** Called during hexa destruction. Nothing to release by default. */
  destroy(): void {
    // Intentionally empty - subclasses override to unsubscribe or clean up.
  }
}
