import { satisfies } from 'semver';
import { runCli } from './runCli';

let detectedVersion: string | null = null;

export async function detectCliVersion(): Promise<string | null> {
  if (detectedVersion !== null) return detectedVersion;

  const result = await runCli('--version');
  const match = result.stdout.match(/version\s+([\d.]+(?:-[\w.]+)?)/);
  detectedVersion = match ? match[1] : null;

  return detectedVersion;
}

export function getCliVersion(): string | null {
  return detectedVersion;
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
