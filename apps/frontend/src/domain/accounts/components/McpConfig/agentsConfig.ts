import { IAgentConfig, IInstallMethod } from './types';

const DEFAULT_HOST = 'https://app.packmind.ai';

const getHostFromMcpUrl = (mcpUrl: string): string => {
  try {
    const url = new URL(mcpUrl);
    return url.origin;
  } catch {
    return DEFAULT_HOST;
  }
};

export const getInstallCliMethod = (): IInstallMethod => ({
  type: 'install-cli',
  label: 'Install CLI',
  available: true,
  getCliCommand: (_token: string, mcpUrl: string, cliLoginCode?: string) => {
    const host = getHostFromMcpUrl(mcpUrl);
    const needsHostExport = host !== DEFAULT_HOST;
    const hostExport = needsHostExport ? `export PACKMIND_HOST=${host}\n` : '';
    const codeExport = cliLoginCode
      ? `export PACKMIND_LOGIN_CODE=${cliLoginCode}\n`
      : '';
    return `${hostExport}${codeExport}curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh | sh`;
  },
});

export const getAgentsConfig = (): IAgentConfig[] => [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Install Packmind MCP for Claude Desktop',
    installMethods: [
      getInstallCliMethod(),
      {
        type: 'cli',
        label: 'Packmind CLI',
        available: true,
        getCliCommand: () => 'packmind-cli setup-mcp --target claude',
      },
      {
        type: 'cli',
        label: 'Claude CLI',
        available: true,
        getCliCommand: (token: string, url: string) =>
          `claude mcp add --transport http packmind ${url} --header "Authorization: Bearer ${token}"`,
      },
    ],
  },
  {
    id: 'github-copilot-vscode',
    name: 'GitHub Copilot (VS Code)',
    description: 'Install Packmind MCP for GitHub Copilot in VS Code',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup-mcp --target copilot',
      },
      {
        type: 'magicLink',
        label: 'One-Click Install',
        available: true,
        getMagicLink: (token: string, url: string) => {
          const config = {
            name: 'packmind',
            type: 'http',
            url,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          const jsonConfig = JSON.stringify(config);
          return `vscode:mcp/install?${encodeURIComponent(jsonConfig)}`;
        },
      },
      {
        type: 'json',
        label: 'JSON Configuration',
        available: true,
        getJsonConfig: (token: string, url: string) => {
          const config = {
            servers: {
              'packmind-mcp-vscode': {
                url,
                type: 'http',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
            inputs: [],
          };
          return JSON.stringify(config, null, 2);
        },
      },
    ],
  },
  {
    id: 'github-copilot-jetbrains',
    name: 'GitHub Copilot (JetBrains)',
    description: 'Install Packmind MCP for GitHub Copilot in JetBrains IDEs',
    installMethods: [
      {
        type: 'json',
        label: 'JSON Configuration',
        available: true,
        getJsonConfig: (token: string, url: string) => {
          const config = {
            'packmind-mcp-server': {
              url,
              requestInit: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          };
          return JSON.stringify(config, null, 2);
        },
      },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Install Packmind MCP for Cursor editor',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup-mcp --target cursor',
      },
      {
        type: 'magicLink',
        label: 'One-Click Install',
        available: true,
        getMagicLink: (token: string, url: string) => {
          const config = {
            url,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          const base64Config = btoa(JSON.stringify(config));
          return `cursor://anysphere.cursor-deeplink/mcp/install?name=packmind&config=${base64Config}`;
        },
      },
      {
        type: 'json',
        label: 'JSON Configuration',
        available: true,
        getJsonConfig: (token: string, url: string) => {
          const config = {
            mcpServers: {
              packmind: {
                url,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          };
          return JSON.stringify(config, null, 2);
        },
      },
    ],
  },
  {
    id: 'continue',
    name: 'Continue.dev Extension',
    description:
      'Install Packmind MCP for Continue.dev extension (VS Code, Cursor, JetBrains)',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup-mcp --target continue',
      },
      {
        type: 'json',
        label: 'Create .continue/mcpServers/packmind.yaml with this content',
        available: true,
        getJsonConfig: (token: string, url: string) => {
          return `name: Packmind MCP Server
version: 0.0.1
schema: v1
mcpServers:
  - name: Packmind
    type: streamable-http
    url: ${url}
    requestOptions:
      headers:
        Authorization: "Bearer ${token}"`;
        },
      },
    ],
  },
  {
    id: 'generic',
    name: 'MCP Generic',
    description: 'Generic MCP configuration for compatible clients',
    installMethods: [
      getInstallCliMethod(),
      {
        type: 'json',
        label: 'JSON Configuration',
        available: true,
        getJsonConfig: (token: string, url: string) => {
          const config = {
            mcpServers: {
              packmind: {
                url,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          };
          return JSON.stringify(config, null, 2);
        },
      },
    ],
  },
];
