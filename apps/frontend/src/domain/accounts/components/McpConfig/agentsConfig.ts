import { IAgentConfig } from './types';

export const getAgentsConfig = (): IAgentConfig[] => [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Install Packmind MCP for Claude Desktop',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup mcp claude',
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
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Install Packmind MCP for GitHub Copilot',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup mcp github-copilot',
      },
      {
        type: 'json',
        label: 'JSON Configuration (VS Code)',
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
      {
        type: 'json',
        label: 'JSON Configuration (JetBrains)',
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
        getCliCommand: () => 'packmind-cli setup mcp cursor',
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
            url,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          return JSON.stringify(config, null, 2);
        },
      },
    ],
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Assistant',
    description: 'Install Packmind MCP for JetBrains IDEs',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup mcp jetbrains',
      },
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
    id: 'generic',
    name: 'MCP Generic',
    description: 'Generic MCP configuration for compatible clients',
    installMethods: [
      {
        type: 'cli',
        label: 'CLI Command',
        available: true,
        getCliCommand: () => 'packmind-cli setup mcp generic',
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
];
