import { OsType } from './types';

const DEFAULT_HOST = 'https://app.packmind.ai';

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

export const buildNpmInstallCommand = (): string =>
  'npm install -g @packmind/cli';

export const buildCurlInstallCommand = (loginCode: string): string => {
  const hostExport = isDefaultHost()
    ? ''
    : `export PACKMIND_HOST=${getCurrentHost()}\n`;
  return `export PACKMIND_LOGIN_CODE=${loginCode}\n${hostExport}curl -fsSL https://packmind.sh/install | sh`;
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
