export type InstallMethodType = 'json' | 'cli' | 'magicLink' | 'install-cli';

export const METHOD_LABELS: Record<InstallMethodType, string> = {
  cli: 'CLI',
  magicLink: 'One-Click Install',
  json: 'JSON',
  'install-cli': 'Install CLI',
} as const;

export interface IInstallMethod {
  type: InstallMethodType;
  label: string;
  available: boolean;
  filePath?: string;
  getCliCommand?: (token: string, url: string, cliLoginCode?: string) => string;
  getJsonConfig?: (token: string, url: string) => string;
  getMagicLink?: (token: string, url: string) => string;
  magicLinkImageSrc?: string;
}

export interface IAgentConfig {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  installMethods: IInstallMethod[];
}

/**
 * Filters and returns only the available install methods from an agent configuration.
 * @param agent - Agent configuration containing install methods
 * @returns Array of available install methods
 */
export const getAvailableMethods = (agent: IAgentConfig): IInstallMethod[] => {
  return agent.installMethods.filter((method) => method.available);
};
