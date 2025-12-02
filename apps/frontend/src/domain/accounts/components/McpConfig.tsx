import React from 'react';
import {
  PMButton,
  PMHStack,
  PMPageSection,
  PMText,
  PMTabs,
  PMVStack,
  PMAlert,
} from '@packmind/ui';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../api/queries/AuthQueries';
import { CopiableTextarea } from '../../../shared/components/inputs';

export const McpConfig: React.FunctionComponent = () => {
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
    <PMPageSection title="MCP Access Token" variant="outline">
      <PMText as="p">
        Generate an access token for MCP (Model Context Protocol) integration.
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
                  <CopiableTextarea
                    value={getVSCodeConfig()}
                    readOnly
                    rows={12}
                    data-testid="mcp-config-vscode"
                  />
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
  );
};
