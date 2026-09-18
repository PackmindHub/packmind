import { EventEmitter } from 'events';
import { PackmindEvent, PackmindEventClass } from '@packmind/types';
import { DataSource } from 'typeorm';
import { BaseService, BaseServiceOpts } from '../BaseService';
import type { HexaRegistry } from '../HexaRegistry';

/**
 * A Node `EventEmitter` behind an API keyed on event classes rather than
 * strings, so a subscription cannot drift from what is emitted. Registered in
 * the HexaRegistry like any other service.
 *
 * In-process only: listeners in another API instance never see these events.
 */
export class PackmindEventEmitterService extends BaseService<BaseServiceOpts> {
  private readonly emitter: EventEmitter;

  constructor(dataSource: DataSource, opts?: Partial<BaseServiceOpts>) {
    super(dataSource, opts);
    this.emitter = new EventEmitter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // Nothing to do - the emitter is built in the constructor.
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }

  /** Returns false when the event had no listeners. */
  emit<T extends PackmindEvent>(event: T): boolean {
    const eventName = event.name;
    return this.emitter.emit(eventName, event);
  }

  on<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): this {
    this.emitter.on(eventClass.eventName, handler);
    return this;
  }

  listenerCount<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
  ): number {
    return this.emitter.listenerCount(eventClass.eventName);
  }

  /** Every event, not just one - intended for shutdown and tests. */
  removeAllListeners(): this {
    this.emitter.removeAllListeners();
    return this;
  }
}
