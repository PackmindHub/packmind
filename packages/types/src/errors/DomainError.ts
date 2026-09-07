/**
 * The semantic outcome a domain error represents, independent of any transport.
 *
 * Deliberately NOT an HTTP status code. The domain layer must not know that it
 * is being served over HTTP — the same error is also raised inside BullMQ
 * workers and domain event listeners, where a status number means nothing.
 * Translating a kind into a status is the adapter's job; see
 * `DomainExceptionFilter` in `@packmind/node-utils`.
 *
 * This union grows one domain at a time. A kind is added when a domain that
 * actually needs it is annotated, so every member here has at least one real
 * error behind it and the filter's mapping table stays exhaustive by
 * construction.
 */
export type DomainErrorKind = 'forbidden' | 'not_found';

/**
 * Context that is safe to return to the caller. It is serialized into the HTTP
 * response body, so it must never carry a token, a password hash, a full
 * entity, or anything else the requester is not already entitled to see.
 */
export type DomainErrorDetails = Readonly<
  Record<string, string | number | boolean>
>;

/**
 * Brand instead of a plain `instanceof DomainError` check.
 *
 * `instanceof` across this monorepo is only as reliable as the module graph,
 * and the graph is not single-copy: the OSS edition aliases `packages/linter`,
 * `marketplaces` and `spaces-management` onto `packages/editions` stubs through
 * `tsconfig.paths.oss.json`, and Jest resolves `@packmind/types` differently
 * from webpack. Two copies of this module would produce two unrelated
 * prototype chains, and a filter keying on `instanceof` would silently miss
 * half the errors while looking correct in every unit test.
 *
 * A brand read off the instance sidesteps the prototype chain entirely, and
 * `Symbol.for` is keyed on the cross-realm global registry so both copies of
 * the module resolve the same symbol. Note this is deliberately not the
 * `Object.setPrototypeOf` trick — the repo's TypeScript standard rules that
 * out for error definitions.
 */
const DOMAIN_ERROR_BRAND = Symbol.for('packmind.DomainError');

/**
 * Base class for errors that describe a legitimate, expected outcome of a
 * request.
 *
 * It lives here rather than in `node-utils/src/errors/` (where the other
 * shared error helpers sit) because of the `@nx/enforce-module-boundaries`
 * env tags: `node-utils` is `env:node`, and `env:browser` may never depend on
 * `env:node`. Hosting it in `types` (`env:shared`) is what lets the frontend
 * import `DomainErrorKind` and narrow on `reason` — the whole point of having
 * a stable discriminator on the wire.
 *
 * A request — a denied permission, a missing resource — as opposed to a bug.
 *
 * Extending this is opt-in per error class, and that opt-in is the whole
 * mechanism: once a class declares its `kind`, every site that throws it
 * answers with the right status, with no change at the throw site and no
 * change in the controller. An error that does not extend this keeps
 * producing the 500-with-stack-trace it produces today, deliberately, so
 * adopting the contract needs no flag day.
 */
export abstract class DomainError extends Error {
  /** What this error means. Drives the HTTP status in the adapter layer. */
  abstract readonly kind: DomainErrorKind;

  /**
   * Stable snake_case discriminator, surfaced to clients as `data.reason`.
   *
   * It is part of the public API contract: clients branch on it instead of
   * matching on message text, so it must not change once shipped, even if the
   * class is renamed or the message is reworded.
   */
  abstract readonly reason: string;

  readonly details?: DomainErrorDetails;

  protected constructor(message: string, details?: DomainErrorDetails) {
    super(message);
    this.details = details;

    // Non-enumerable so it stays out of anything that walks own properties —
    // structured log payloads in particular.
    Object.defineProperty(this, DOMAIN_ERROR_BRAND, {
      value: true,
      enumerable: false,
    });
  }
}

export function isDomainError(candidate: unknown): candidate is DomainError {
  return (
    candidate instanceof Error &&
    (candidate as unknown as Record<symbol, unknown>)[DOMAIN_ERROR_BRAND] ===
      true
  );
}
