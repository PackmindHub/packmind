import React from 'react';
import {
  PMDialog,
  PMButton,
  PMVStack,
  PMTabs,
  PMText,
  PMHStack,
} from '@packmind/ui';
import { CopiableTextarea } from '../../../../shared/components/inputs';
import {
  IAgentConfig,
  IInstallMethod,
  groupMethodsByType,
  getAvailableMethods,
} from './types';

interface IAgentModalProps {
  agent: IAgentConfig;
  token: string;
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

interface IMethodContentProps {
  method: IInstallMethod;
  token: string;
  url: string;
}

const CliMethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  if (!method.getCliCommand) return null;

  const command = method.getCliCommand(token, url);

  return (
    <PMVStack gap={4} width="100%">
      <PMText as="p" fontSize="sm" color="faded">
        Run this command in your terminal:
      </PMText>
      <CopiableTextarea value={command} readOnly rows={2} />
    </PMVStack>
  );
};

const MagicLinkMethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  if (!method.getMagicLink) return null;

  const magicLink = method.getMagicLink(token, url);

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="faded">
        Click the button below to install automatically:
      </PMText>
      <PMHStack gap={4}>
        <a href={magicLink} data-testid="cursor-install-button">
          <img
            src="https://cursor.com/deeplink/mcp-install-dark.png"
            alt="Add Packmind MCP server to Cursor"
            style={{ maxHeight: 32 }}
          />
        </a>
      </PMHStack>
    </PMVStack>
  );
};

const JsonMethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  if (!method.getJsonConfig) return null;

  const config = method.getJsonConfig(token, url);

  return (
    <PMVStack gap={4} width="100%">
      <PMText as="p" fontSize="sm" color="faded">
        {method.label}:
      </PMText>
      <CopiableTextarea value={config} readOnly rows={12} />
    </PMVStack>
  );
};

const MethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  switch (method.type) {
    case 'cli':
      return <CliMethodContent method={method} token={token} url={url} />;
    case 'magicLink':
      return <MagicLinkMethodContent method={method} token={token} url={url} />;
    case 'json':
      return <JsonMethodContent method={method} token={token} url={url} />;
    default:
      return null;
  }
};

const createTabsFromMethods = (
  methodsByType: Record<string, IInstallMethod[]>,
  token: string,
  url: string,
) => {
  return Object.entries(methodsByType).map(([type, methods]) => {
    const firstMethod = methods[0];

    return {
      value: type,
      triggerLabel: firstMethod.label,
      content: (
        <PMVStack gap={4} width="100%" p={4}>
          {methods.length > 1 ? (
            <PMVStack gap={6} width="100%">
              {methods.map((method, index) => (
                <PMVStack key={index} gap={2} width="100%">
                  <MethodContent method={method} token={token} url={url} />
                </PMVStack>
              ))}
            </PMVStack>
          ) : (
            <MethodContent method={firstMethod} token={token} url={url} />
          )}
        </PMVStack>
      ),
    };
  });
};

export const AgentModal: React.FunctionComponent<IAgentModalProps> = ({
  agent,
  token,
  url,
  isOpen,
  onClose,
}) => {
  const availableMethods = getAvailableMethods(agent);

  if (availableMethods.length === 0) return null;

  const methodsByType = groupMethodsByType(availableMethods);
  const tabs = createTabsFromMethods(methodsByType, token, url);

  return (
    <PMDialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="center"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content maxW="600px">
          <PMDialog.Header>
            <PMHStack justifyContent="space-between" width="100%">
              <PMText as="p" fontWeight="bold">
                {agent.name}
              </PMText>
              <PMDialog.CloseTrigger />
            </PMHStack>
          </PMDialog.Header>
          <PMDialog.Body maxH="70vh" overflowY="auto">
            {tabs.length === 1 ? (
              // Single method, no tabs needed
              tabs[0].content
            ) : (
              // Multiple methods, use tabs
              <PMTabs width="100%" defaultValue={tabs[0].value} tabs={tabs} />
            )}
          </PMDialog.Body>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
