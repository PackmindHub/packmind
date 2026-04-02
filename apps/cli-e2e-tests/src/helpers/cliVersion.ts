import { satisfies } from 'semver';

let detectedVersion: string | null | undefined = undefined;

export function setDetectedVersion(version: string | null): void {
  detectedVersion = version;
}

export function getCliVersion(): string | null {
  return detectedVersion ?? null;
}

export function isProductionMode(): boolean {
  return !!process.env['CLI_BINARY_PATH'];
}

export function matchesVersionConstraint(range: string): boolean {
  if (!isProductionMode()) return true;

  const version = getCliVersion();
  if (!version) {
    throw new Error(
      '[cli-e2e] Production mode: CLI version could not be detected. ' +
        'Set CLI_BINARY_PATH to a valid binary.',
    );
  }

  return satisfies(version, range);
}
