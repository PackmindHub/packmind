import { PackmindEdition } from '@packmind/types';
import { getServerEdition } from './serverEdition';

/**
 * Runs a suite only against the edition it was written for. The two editions
 * mount different routes, so a spec about a route one of them stubs out has no
 * meaning on the other and would fail there.
 */
export function describeForEdition(
  edition: PackmindEdition,
  description: string,
  fn: () => void,
): void {
  describe(`${description} [${edition} edition]`, () => {
    const running = getServerEdition();

    if (running !== edition) {
      it.skip(`skipped — the stack under test runs the ${running} edition`, () =>
        undefined);
      return;
    }

    fn();
  });
}
