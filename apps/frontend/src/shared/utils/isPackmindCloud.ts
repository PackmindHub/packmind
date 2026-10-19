// Cloud-only vendors (Crisp, Sentry) check this at runtime as well as relying on
// release builds blanking their keys: a self-hosted, possibly air-gapped
// instance must never reach them, even if a build leaks the keys.
const PACKMIND_CLOUD_HOSTNAMES = new Set(['app.packmind.ai']);

export function isPackmindCloud(): boolean {
  if (typeof window === 'undefined') return false;
  return PACKMIND_CLOUD_HOSTNAMES.has(window.location.hostname);
}
