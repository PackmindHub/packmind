/**
 * What of a wrapped failure goes into the log: an `Error` contributes its own
 * message and stack, which `cause` exists to keep; anything else is logged as
 * thrown.
 */
export function describeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message, stack: cause.stack };
  }

  return cause;
}
