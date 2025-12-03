import { command } from 'cmd-ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

const CREDENTIALS_DIR = '.packmind';
const CREDENTIALS_FILE = 'credentials.json';

interface Credentials {
  apiKey: string;
  host: string;
  expiresAt: string;
}

interface ApiKeyPayload {
  host: string;
  jwt: string;
}

interface JwtPayload {
  user?: {
    name: string;
    userId: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
  exp?: number;
  iat?: number;
}

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

function loadCredentials(): Credentials | null {
  const credentialsPath = getCredentialsPath();

  if (!fs.existsSync(credentialsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    return JSON.parse(content) as Credentials;
  } catch {
    return null;
  }
}

/**
 * Decodes an API key to extract host and JWT payload.
 * API key format: base64({ host: string, jwt: string })
 * JWT payload contains: { user, organization, exp, iat }
 */
function decodeApiKey(
  apiKey: string,
): { host: string; jwt: JwtPayload } | null {
  try {
    // First decode the base64 wrapper to get { host, jwt }
    const jsonString = Buffer.from(apiKey.trim(), 'base64').toString('utf-8');
    const apiKeyPayload = JSON.parse(jsonString) as ApiKeyPayload;

    if (!apiKeyPayload.host || !apiKeyPayload.jwt) {
      return null;
    }

    // Then decode the JWT payload (middle part of JWT)
    const jwtParts = apiKeyPayload.jwt.split('.');
    if (jwtParts.length !== 3) {
      return { host: apiKeyPayload.host, jwt: {} };
    }

    const jwtPayload = Buffer.from(jwtParts[1], 'base64').toString('utf-8');
    const decoded = JSON.parse(jwtPayload) as JwtPayload;

    return { host: apiKeyPayload.host, jwt: decoded };
  } catch {
    return null;
  }
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '********';
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function formatExpiresAt(expiresAt: Date): string {
  const now = new Date();

  if (expiresAt < now) {
    return `Expired: ${expiresAt.toLocaleDateString()}`;
  }

  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (diffDays > 0) {
    return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return 'Expires soon';
}

interface AuthInfo {
  apiKey: string;
  host: string;
  organizationName?: string;
  userName?: string;
  expiresAt?: Date;
  source: string;
}

function displayAuthInfo(info: AuthInfo, isExpired: boolean): void {
  console.log(`\nAPI Key: ${maskApiKey(info.apiKey)}`);
  console.log(`Host: ${info.host}`);
  if (info.organizationName) {
    console.log(`Organization: ${info.organizationName}`);
  }
  if (info.userName) {
    console.log(`User: ${info.userName}`);
  }
  if (info.expiresAt) {
    console.log(formatExpiresAt(info.expiresAt));
  }
  logInfoConsole(`Source: ${info.source}`);

  if (isExpired) {
    console.log('\nRun `packmind-cli login` to re-authenticate.');
  }
}

export const whoamiCommand = command({
  name: 'whoami',
  description: 'Show current authentication status and credentials info',
  args: {},
  handler: async () => {
    // Check environment variable first
    const envApiKey = process.env.PACKMIND_API_KEY_V3;
    if (envApiKey) {
      const decoded = decodeApiKey(envApiKey);
      const expiresAt = decoded?.jwt.exp
        ? new Date(decoded.jwt.exp * 1000)
        : undefined;
      const isExpired = expiresAt ? expiresAt < new Date() : false;

      if (isExpired) {
        logErrorConsole('Credentials expired');
      } else {
        logSuccessConsole('Authenticated');
      }

      displayAuthInfo(
        {
          apiKey: envApiKey,
          host: decoded?.host || 'Unknown',
          organizationName: decoded?.jwt.organization?.name,
          userName: decoded?.jwt.user?.name,
          expiresAt,
          source: 'PACKMIND_API_KEY_V3 environment variable',
        },
        isExpired,
      );

      if (isExpired) {
        process.exit(1);
      }
      return;
    }

    // Check credentials file
    const credentials = loadCredentials();

    if (!credentials) {
      logErrorConsole('Not authenticated');
      console.log(
        '\nNo credentials found. Run `packmind-cli login` to authenticate.',
      );
      process.exit(1);
    }

    const expiresAt = new Date(credentials.expiresAt);
    const isExpired = expiresAt < new Date();
    const decoded = decodeApiKey(credentials.apiKey);

    if (isExpired) {
      logErrorConsole('Credentials expired');
    } else {
      logSuccessConsole('Authenticated');
    }

    displayAuthInfo(
      {
        apiKey: credentials.apiKey,
        host: credentials.host,
        organizationName: decoded?.jwt.organization?.name,
        userName: decoded?.jwt.user?.name,
        expiresAt,
        source: getCredentialsPath(),
      },
      isExpired,
    );

    if (isExpired) {
      process.exit(1);
    }
  },
});
