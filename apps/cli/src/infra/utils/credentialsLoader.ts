import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CREDENTIALS_DIR = '.packmind';
const CREDENTIALS_FILE = 'credentials.json';

interface Credentials {
  apiKey: string;
  host: string;
  expiresAt: string;
}

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

function loadCredentialsFromFile(): Credentials | null {
  const credentialsPath = getCredentialsPath();

  if (!fs.existsSync(credentialsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    const credentials = JSON.parse(content) as Credentials;

    if (!credentials.apiKey) {
      return null;
    }

    // Check if credentials have expired
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < new Date()) {
        return null;
      }
    }

    return credentials;
  } catch {
    return null;
  }
}

/**
 * Loads the API key from environment variable or credentials file.
 * Priority:
 * 1. PACKMIND_API_KEY_V3 environment variable
 * 2. ~/.packmind/credentials.json file
 *
 * @returns The API key or empty string if not found
 */
export function loadApiKey(): string {
  // First, check environment variable
  const envApiKey = process.env.PACKMIND_API_KEY_V3;
  if (envApiKey) {
    return envApiKey;
  }

  // Fallback to credentials file
  const credentials = loadCredentialsFromFile();
  if (credentials) {
    return credentials.apiKey;
  }

  return '';
}

/**
 * Checks if credentials are available (either from env or file)
 */
export function hasCredentials(): boolean {
  return loadApiKey() !== '';
}
