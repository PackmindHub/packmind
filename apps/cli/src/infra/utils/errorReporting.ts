import { reportError } from './errorDiagnostics';

/**
 * Wraps every method of `target` so that any error it raises reaches
 * `~/.packmind/error.log` before the caller sees it.
 *
 * Commands catch their own failures and print a message — forty-odd call
 * sites do — which means the stack is gone by the time anything global could
 * look at it. Reporting on the way out of the facade keeps the stack without
 * asking each command to cooperate, and `reportError` tags the error so the
 * layers above do not record it a second time.
 *
 * The error is always re-thrown: this observes, it never handles.
 */
export function withErrorReporting<T extends object>(target: T): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      const value = Reflect.get(object, property, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]): unknown => {
        try {
          // Applied to the raw object rather than the proxy, so a method
          // calling a sibling does not report the same error twice.
          const result = (value as (...a: unknown[]) => unknown).apply(
            object,
            args,
          );

          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              reportError(error);
              throw error;
            });
          }

          return result;
        } catch (error) {
          reportError(error);
          throw error;
        }
      };
    },
  });
}
