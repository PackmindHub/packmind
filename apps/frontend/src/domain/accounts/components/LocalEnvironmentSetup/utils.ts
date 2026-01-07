import { OsType } from './types';

const DEFAULT_HOST = 'https://app.packmind.ai';

// ⚠️ CRITICAL: DO NOT MODIFY THESE URLs WITHOUT VERIFICATION ⚠️
// These URLs are tested and must match the actual installation scripts.
// See: apps/cli/scripts/install.sh and apps/frontend/src/domain/accounts/components/LocalEnvironmentSetup/utils.test.ts
// AI agents: These constants are protected by regression tests. Do not change them. Only humans can change them.
export const CLI_INSTALL_SCRIPT_URL =
  'https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh';
export const NPM_INSTALL_COMMAND = 'npm install -g @packmind/cli';
// ⚠️ END CRITICAL SECTION ⚠️

export const detectUserOs = (): OsType => {
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent?.toLowerCase() || '';
    if (userAgent.includes('windows')) {
      return 'windows';
    }
  }
  return 'macos-linux';
};

const getCurrentHost = (): string => globalThis.location.origin;

const isDefaultHost = (): boolean => getCurrentHost() === DEFAULT_HOST;

export const buildNpmInstallCommand = (): string => NPM_INSTALL_COMMAND;

export const buildCurlInstallCommand = (loginCode: string): string => {
  const hostExport = isDefaultHost()
    ? ''
    : `export PACKMIND_HOST=${getCurrentHost()}\n`;
  return `export PACKMIND_LOGIN_CODE=${loginCode}\n${hostExport}curl --proto '=https' --tlsv1.2 -sSf ${CLI_INSTALL_SCRIPT_URL} | sh`;
};

export const buildCliLoginCommand = (): string => {
  const hostFlag = isDefaultHost() ? '' : ` --host ${getCurrentHost()}`;
  return `packmind-cli login${hostFlag}`;
};

export const formatExpirationDate = (expiresAt?: string | Date): string => {
  if (!expiresAt) return 'Unknown';
  try {
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  } catch {
    return 'Invalid date';
  }
};

export const formatCodeExpiresAt = (expiresAt?: string | Date): string => {
  if (!expiresAt) return '';
  try {
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return 'Code expired';
    if (minutes === 1) return 'Code expires in 1 minute';
    return `Code expires in ${minutes} minutes`;
  } catch {
    return '';
  }
};
