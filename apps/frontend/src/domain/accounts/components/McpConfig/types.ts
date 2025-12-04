export type InstallMethodType = 'json' | 'cli' | 'magicLink';

export interface IInstallMethod {
  type: InstallMethodType;
  label: string;
  available: boolean;
  getCliCommand?: (token: string, url: string) => string;
  getJsonConfig?: (token: string, url: string) => string;
  getMagicLink?: (token: string, url: string) => string;
}

export interface IAgentConfig {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  installMethods: IInstallMethod[];
}

export interface IMethodsByType {
  [type: string]: IInstallMethod[];
}

// Helper to group install methods by type
export const groupMethodsByType = (
  methods: IInstallMethod[],
): IMethodsByType => {
  return methods.reduce((acc, method) => {
    if (!acc[method.type]) {
      acc[method.type] = [];
    }
    acc[method.type].push(method);
    return acc;
  }, {} as IMethodsByType);
};

// Helper to get available methods from an agent config
export const getAvailableMethods = (agent: IAgentConfig): IInstallMethod[] => {
  return agent.installMethods.filter((method) => method.available);
};
