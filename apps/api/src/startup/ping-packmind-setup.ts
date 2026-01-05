import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Cache, Configuration } from '@packmind/node-utils';

const origin = 'PingPackmindSetup';
const logger = new PackmindLogger(origin, LogLevel.INFO);

const INSTANCE_ID_CACHE_KEY = 'packmind:instanceId';
const INSTANCE_ID_EXPIRATION_SECONDS = 365 * 24 * 60 * 60; // 365 days
const WEBHOOK_URL =
  'https://packmind.app.n8n.cloud/webhook/ping-packmind-setup';

/**
 * Read version from root package.json
 */
function getVersion(): string | null {
  try {
    // Try multiple possible locations for package.json
    // 1. In production build: dist/apps/api/package.json (copied during build)
    // 2. In development: workspace root package.json
    const possiblePaths = [
      path.join(process.cwd(), 'package.json'), // Current working directory (works in most cases)
      path.join(__dirname, '..', '..', '..', '..', 'package.json'), // From apps/api/src/startup to root
      path.join(__dirname, 'package.json'), // In dist/apps/api (production build)
    ];

    for (const packageJsonPath of possiblePaths) {
      try {
        if (fs.existsSync(packageJsonPath)) {
          const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);
          if (packageJson.version) {
            logger.debug('Found package.json', { path: packageJsonPath });
            return packageJson.version;
          }
        }
      } catch {
        // Continue to next path
        continue;
      }
    }

    logger.warn('Could not find package.json in any expected location');
    return null;
  } catch (error) {
    logger.warn('Failed to read version from package.json', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Send ping to Packmind setup webhook
 */
async function sendPing(version: string, instanceId: string): Promise<void> {
  try {
    const payload = {
      version,
      instanceId,
    };

    logger.info('Sending ping to Packmind setup webhook', {
      url: WEBHOOK_URL,
      version,
      instanceId,
    });

    await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('Successfully sent ping to Packmind setup webhook', {
      version,
      instanceId,
    });
  } catch (error) {
    // Log error but don't throw - this should not affect server startup
    logger.warn('Failed to send ping to Packmind setup webhook', {
      error: error instanceof Error ? error.message : String(error),
      version,
      instanceId,
    });
  }
}

/**
 * Ping Packmind setup webhook with server version and instance ID
 * This function should be called after the server starts successfully
 */
export async function pingPackmindSetup(): Promise<void> {
  try {
    // First check if instance ID already exists in cache
    // If it exists, the ping was already sent, so return silently
    const cache = Cache.getInstance();
    const existingInstanceId = await cache.get<string>(INSTANCE_ID_CACHE_KEY);

    if (existingInstanceId) {
      logger.debug('Instance ID already exists in cache, skipping ping');
      return;
    }

    // Check if ping is disabled via environment variable
    const disablePing = await Configuration.getConfig('DISABLE_PING');
    if (disablePing === 'true') {
      logger.info('Ping disabled via DISABLE_PING environment variable');
      return;
    }

    // Check if running in CI environment
    const ci = await Configuration.getConfig('CI');
    if (ci === 'true') {
      logger.info('Skipping ping in CI environment');
      return;
    }

    // Get version from package.json
    const version = getVersion();
    if (!version) {
      logger.warn('Could not determine version, skipping ping');
      return;
    }

    // Create new instance ID
    const newInstanceId = uuidv4();
    logger.info('Generated new instance ID for first ping', {
      instanceId: newInstanceId,
    });

    // Store in cache with 365-day expiration
    await cache.set(
      INSTANCE_ID_CACHE_KEY,
      newInstanceId,
      INSTANCE_ID_EXPIRATION_SECONDS,
    );

    // Send ping (fire-and-forget, errors are handled internally)
    await sendPing(version, newInstanceId);
  } catch (error) {
    // Catch any unexpected errors to ensure server startup is not affected
    logger.warn('Unexpected error in pingPackmindSetup', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
