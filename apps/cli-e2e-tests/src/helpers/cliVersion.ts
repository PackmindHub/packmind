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
  if (!version) return true;

  return satisfies(version, range);
}
