import { IAgentConfig } from './types';

export const getAgentsConfig = (): IAgentConfig[] => [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Install Packmind MCP for Claude Desktop',
    installMethods: [
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
    id: 'generic',
    name: 'MCP Generic',
    description: 'Generic MCP configuration for compatible clients',
    installMethods: [
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
