import { matchesVersionConstraint } from './cliVersion';

// Placeholder for skipped tests — intentionally empty
const noop = () => undefined;

export function describeForVersion(
  range: string,
  description: string,
  fn: () => void,
): void {
  describe(`${description} [cli ${range}]`, () => {
    if (!matchesVersionConstraint(range)) {
      it.skip(`skipped — CLI version does not satisfy ${range}`, noop);
      return;
    }
    fn();
  });
}

export function itForVersion(
  range: string,
  description: string,
  fn: jest.ProvidesCallback,
  timeout?: number,
): void {
  if (!matchesVersionConstraint(range)) {
    it.skip(`${description} [requires cli ${range}]`, noop);
    return;
  }
  it(description, fn, timeout);
}
