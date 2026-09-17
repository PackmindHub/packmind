import { neverMocked } from './neverMocked';

import Mocked = jest.Mocked;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

/**
 * A `jest.Mocked<T>` whose every method is backed by a `jest.fn()`, built by
 * walking the class prototype rather than by listing the methods at the call
 * site. Stub what the test needs on the returned mock:
 *
 * ```ts
 * const service = createMockInstance(StandardService);
 * service.getStandardById.mockResolvedValue(standard);
 * ```
 *
 * The walk climbs the prototype chain, so methods a class inherits are mocked
 * too - `AbstractRepository.findById` is as real to a caller as anything
 * `PackageRepository` declares itself. It stops before `Object.prototype`, and
 * a subclass override wins over the base it shadows, so the mock has exactly
 * the methods an instance would answer.
 *
 * Only members whose descriptor holds a function are mocked, so getters and
 * arrow-function class fields (`foo = () => {}`, an own property of the
 * instance rather than of the prototype) are skipped - a class relying on
 * either is better mocked by hand.
 */
export function createMockInstance<T>(cls: Constructor<T>): jest.Mocked<T> {
  const obj = {} as jest.Mocked<T>;

  let proto: object | null = cls.prototype;
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (neverMocked.has(key)) continue;
      // A more derived prototype was walked first, so its override stands.
      if (Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor && typeof descriptor.value === 'function') {
        obj[key as keyof T] = jest.fn() as Mocked<T>[keyof T];
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  return obj;
}
