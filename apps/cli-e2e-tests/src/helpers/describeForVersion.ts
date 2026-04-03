import { matchesVersionConstraint } from './cliVersion';

export function describeForVersion(
  range: string,
  description: string,
  fn: () => void,
): void {
  describe(`${description} [cli ${range}]`, () => {
    if (!matchesVersionConstraint(range)) {
      it.skip(`skipped — CLI version does not satisfy ${range}`, () =>
        undefined);
      return;
    }
    fn();
  });
}
