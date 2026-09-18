/**
 * Base class for all Packmind domain events, which let hexas communicate
 * without depending on each other directly. Every subclass must define a
 * static `eventName`, since that string — not the class — is what the emitter
 * matches on.
 */
export abstract class PackmindEvent<TPayload = unknown> {
  /** Must be overridden. Convention: `domain.entity.action`. */
  static readonly eventName: string;

  constructor(public readonly payload: TPayload) {}

  get name(): string {
    return (this.constructor as typeof PackmindEvent).eventName;
  }
}

export type PackmindEventClass<T extends PackmindEvent = PackmindEvent> = {
  new (payload: T extends PackmindEvent<infer P> ? P : never): T;
  readonly eventName: string;
};
