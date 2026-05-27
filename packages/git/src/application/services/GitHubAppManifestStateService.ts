import crypto from 'crypto';
import { PackmindLogger } from '@packmind/logger';

const origin = 'GitHubAppManifestStateService';
const STATE_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

export class GitHubAppManifestStateService {
  private readonly states = new Map<string, number>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      CLEANUP_INTERVAL_MS,
    );
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  issue(): string {
    const state = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + STATE_TTL_MS;
    this.states.set(state, expiry);
    this.logger.info('Manifest state token issued');
    return state;
  }

  consume(state: string): boolean {
    const expiry = this.states.get(state);

    if (expiry === undefined) {
      return false;
    }

    this.states.delete(state);

    if (Date.now() > expiry) {
      return false;
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [state, expiry] of this.states.entries()) {
      if (now > expiry) {
        this.states.delete(state);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
