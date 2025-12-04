import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ICredentialsProvider,
  DecodedCredentials,
} from './ICredentialsProvider';
import { decodeApiKey } from './decodeApiKey';

const CREDENTIALS_DIR = '.packmind';
const CREDENTIALS_FILE = 'credentials.json';

interface StoredCredentials {
  apiKey: string;
}

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

export class FileCredentialsProvider implements ICredentialsProvider {
  getSourceName(): string {
    return getCredentialsPath();
  }

  hasCredentials(): boolean {
    const credentialsPath = getCredentialsPath();
    if (!fs.existsSync(credentialsPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(content) as StoredCredentials;
      return !!credentials.apiKey;
    } catch {
      return false;
    }
  }

  loadCredentials(): DecodedCredentials | null {
    const credentialsPath = getCredentialsPath();
    if (!fs.existsSync(credentialsPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(content) as StoredCredentials;

      if (!credentials.apiKey) {
        return null;
      }

      const decoded = decodeApiKey(credentials.apiKey);
      if (!decoded) {
        return null;
      }

      const expiresAt = decoded.jwt.exp
        ? new Date(decoded.jwt.exp * 1000)
        : undefined;

      return {
        apiKey: credentials.apiKey,
        host: decoded.host,
        organizationName: decoded.jwt.organization?.name,
        userName: decoded.jwt.user?.name,
        expiresAt,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Utility function to get the credentials file path (used by LoginCommand and WhoamiCommand)
 */
export { getCredentialsPath };

/**
 * Saves credentials to the credentials file
 */
export function saveCredentials(apiKey: string): void {
  const credentialsDir = path.join(os.homedir(), CREDENTIALS_DIR);

  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  }

  const credentialsPath = getCredentialsPath();
  const credentials: StoredCredentials = { apiKey };
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}
