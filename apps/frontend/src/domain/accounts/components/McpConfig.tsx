import React from 'react';
import {
  PMButton,
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
            ]}
          />
        </PMVStack>
      )}
    </PMPageSection>
  );
};
