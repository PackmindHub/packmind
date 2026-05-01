import * as fs from 'fs';

/**
 * Returns true when a Docker daemon is reachable. Specs that depend on
 * Testcontainers should guard with this so they skip cleanly on machines
 * without Docker (e.g., sandboxed CI shards, local dev without daemon
 * running).
 */
export function isDockerAvailable(): boolean {
  if (process.env['DOCKER_HOST']) return true;
  if (fs.existsSync('/var/run/docker.sock')) return true;
  return false;
}
