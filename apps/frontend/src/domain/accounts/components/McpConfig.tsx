import React from 'react';
import {
  PMButton,
  PMHStack,
  PMPageSection,
  PMText,
  PMTabs,
  PMVStack,
  PMAlert,
  PMFeatureFlag,
  MCP_CONFIG_REDESIGN_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../api/queries/AuthQueries';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { McpConfigRedesigned } from './McpConfig/McpConfigRedesigned';
import { useAuthContext } from '../hooks/useAuthContext';

// VS Code icon as inline SVG
const VSCodeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M74.5 97.5L24.5 85V15L74.5 2.5V97.5Z" fill="#007ACC" />
    <path
      d="M74.5 27.5L50 50L74.5 72.5V97.5L24.5 85L50 50L24.5 15L74.5 2.5V27.5Z"
      fill="#1F9CF0"
    />
    <path d="M24.5 15L50 50L24.5 85V15Z" fill="#0065A9" />
  </svg>
);

// Styled badge component similar to Cursor's
const VSCodeInstallBadge: React.FC<{ href: string }> = ({ href }) => (
  <a
    href={href}
    data-testid="vscode-install-button"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#007ACC',
      color: 'white',
      borderRadius: '6px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#005a9e';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#007ACC';
    }}
  >
    <VSCodeIcon />
    <span>Install in VS Code</span>
  </a>
);

export const McpConfig: React.FunctionComponent = () => {
  const { user } = useAuthContext();
  const getMcpTokenMutation = useGetMcpTokenMutation();
  const getMcpURLQuery = useGetMcpURLQuery();

  const handleGetToken = () => {
    getMcpTokenMutation.mutate();
  };

  const { url } = getMcpURLQuery.data || {};

  const getClassicMcpConfig = () => {
    if (getMcpTokenMutation.data?.access_token) {
      const config = {
        mcpServers: {
          packmind: {
            url,
            headers: {
              Authorization: `Bearer ${getMcpTokenMutation.data.access_token}`,
            },
          },
        },
      };
      return JSON.stringify(config, null, 2);
    }
    return '';
  };

  const getVSCodeConfig = () => {
    if (getMcpTokenMutation.data?.access_token) {
      const config = {
        servers: {
          'packmind-mcp-vscode': {
            url,
            type: 'http',
            headers: {
              Authorization: `Bearer ${getMcpTokenMutation.data.access_token}`,
            },
          },
        },
        inputs: [],
      };
      return JSON.stringify(config, null, 2);
    }
    return '';
  };

  const getVSCodeInstallLink = () => {
    if (getMcpTokenMutation.data?.access_token && url) {
      // VS Code expects a server configuration object matching mcp.json format
      const config = {
        name: 'packmind',
        type: 'http',
        url: url,
        headers: {
          Authorization: `Bearer ${getMcpTokenMutation.data.access_token}`,
        },
      };
      // Double-stringify and encode to ensure proper URL encoding
      const jsonConfig = JSON.stringify(config);
      return `vscode:mcp/install?${encodeURIComponent(jsonConfig)}`;
    }
    return '';
  };

  const getClaudeCliCommand = () => {
    if (getMcpTokenMutation.data?.access_token) {
      return `claude mcp add --transport http packmind ${url} --header "Authorization: Bearer ${getMcpTokenMutation.data.access_token}"`;
    }
    return '';
  };

  const getGithubCopilotJetBrainsConfig = () => {
    if (getMcpTokenMutation.data?.access_token) {
      const config = {
        'packmind-mcp-server': {
          url,
          requestInit: {
            headers: {
              Authorization: `Bearer ${getMcpTokenMutation.data.access_token}`,
            },
          },
        },
      };
      return JSON.stringify(config, null, 2);
    }
    return '';
  };

  const getCursorInstallLink = () => {
    if (getMcpTokenMutation.data?.access_token && url) {
      const config = {
        url,
        headers: {
          Authorization: `Bearer ${getMcpTokenMutation.data.access_token}`,
        },
      };
      const base64Config = btoa(JSON.stringify(config));
      return `cursor://anysphere.cursor-deeplink/mcp/install?name=packmind&config=${base64Config}`;
    }
    return '';
  };

  return (
    <>
      <PMFeatureFlag
        featureKeys={[MCP_CONFIG_REDESIGN_FEATURE_KEY]}
        featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
        userEmail={user?.email}
      >
        <McpConfigRedesigned />
      </PMFeatureFlag>

      <PMFeatureFlag
        featureKeys={[]}
        featureDomainMap={{}}
        userEmail={user?.email}
      >
        <PMPageSection title="MCP Access Token" variant="outline">
          <PMText as="p">
            Generate an access token for MCP (Model Context Protocol)
            integration.
          </PMText>

          <PMButton
            onClick={handleGetToken}
            disabled={getMcpTokenMutation.isPending}
            marginBottom={4}
          >
            {getMcpTokenMutation.isPending
              ? 'Getting Token...'
              : 'Get MCP Access Token'}
          </PMButton>

          {getMcpTokenMutation.isError && (
            <div>
              <h3>Error!</h3>
              <p>
                {getMcpTokenMutation.error instanceof Error
                  ? getMcpTokenMutation.error.message
                  : 'Failed to retrieve MCP access token'}
              </p>
            </div>
          )}

          {getMcpTokenMutation.isSuccess && getMcpTokenMutation.data && (
            <PMVStack width={'100%'} alignItems={'baseline'}>
              <PMAlert.Root status="success">
                <PMAlert.Indicator />
                <PMAlert.Title>Token Generated Successfully!</PMAlert.Title>
              </PMAlert.Root>

              <PMTabs
                width={'100%'}
                defaultValue="classic"
                tabs={[
                  {
                    value: 'classic',
                    triggerLabel: 'Classic MCP',
                    content: (
                      <CopiableTextarea
                        value={getClassicMcpConfig()}
                        readOnly
                        rows={12}
                        data-testid="mcp-config-classic"
                      />
                    ),
                  },
                  {
                    value: 'vscode',
                    triggerLabel: 'VS Code',
                    content: (
                      <PMVStack
                        gap={4}
                        width="100%"
                        pt={8}
                        data-testid="mcp-config-vscode"
                      >
                        <PMHStack gap={4}>
                          <VSCodeInstallBadge href={getVSCodeInstallLink()} />
                        </PMHStack>
                        <PMText as="p" variant="small" color="faded">
                          Or copy the configuration below and save it to{' '}
                          <code>.vscode/mcp.json</code> in your workspace or{' '}
                          <code>mcp.json</code> in your user settings directory.
                        </PMText>
                        <CopiableTextarea
                          value={getVSCodeConfig()}
                          readOnly
                          rows={12}
                          data-testid="mcp-config-vscode-textarea"
                        />
                      </PMVStack>
                    ),
                  },
                  {
                    value: 'cli',
                    triggerLabel: 'Claude CLI',
                    content: (
                      <CopiableTextarea
                        value={getClaudeCliCommand()}
                        readOnly
                        rows={12}
                        data-testid="mcp-config-cli"
                      />
                    ),
                  },
                  {
                    value: 'github-jetbrains',
                    triggerLabel: 'GitHub Copilot (JetBrains)',
                    content: (
                      <CopiableTextarea
                        value={getGithubCopilotJetBrainsConfig()}
                        readOnly
                        rows={12}
                        data-testid="mcp-config-github-jetbrains"
                      />
                    ),
                  },
                  {
                    value: 'cursor',
                    triggerLabel: 'Cursor',
                    content: (
                      <PMVStack
                        gap={4}
                        width="100%"
                        pt={8}
                        data-testid="mcp-config-cursor"
                      >
                        <PMHStack gap={4}>
                          <a
                            href={getCursorInstallLink()}
                            data-testid="cursor-install-button"
                          >
                            <img
                              src="https://cursor.com/deeplink/mcp-install-dark.png"
                              alt="Add Packmind MCP server to Cursor"
                              style={{ maxHeight: 32 }}
                            />
                          </a>
                        </PMHStack>
                      </PMVStack>
                    ),
                  },
                ]}
              />
            </PMVStack>
          )}
        </PMPageSection>
      </PMFeatureFlag>
    </>
  );
};
