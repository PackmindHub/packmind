import React, { useMemo } from 'react';
import {
  PMDialog,
  PMButton,
  PMVStack,
  PMTabs,
  PMText,
  PMHStack,
  PMLink,
  PMCloseButton,
} from '@packmind/ui';
import { CopiableTextarea } from '../../../../shared/components/inputs';
import {
  IAgentConfig,
  IInstallMethod,
  groupMethodsByType,
  getAvailableMethods,
} from './types';

// VS Code icon from CDN
const VSCodeIcon = () => (
  <img
    src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg"
    alt="VS Code"
    width={16}
    height={16}
  />
);

// VS Code install button using PMLink with VS Code blue color
const VSCodeInstallBadge: React.FC<{ href: string }> = ({ href }) => (
  <PMLink href={href} variant="plain" data-testid="vscode-install-button">
    <PMButton as="span" bg="#007ACC" color="white" _hover={{ bg: '#005a9e' }}>
      <VSCodeIcon />
      Install in VS Code
    </PMButton>
  </PMLink>
);

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

const METHOD_DESCRIPTIONS = {
  cli: 'Run this command in your terminal:',
  magicLink: 'Click the button below to install automatically:',
  json: (label: string) => `${label}:`,
} as const;

const CliMethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const command = method.getCliCommand?.(token, url);
  if (!command) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="faded">
        {METHOD_DESCRIPTIONS.cli}
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
  const magicLink = method.getMagicLink?.(token, url);
  if (!magicLink) return null;

  const isVSCode = magicLink.startsWith('vscode:');

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="faded">
        {METHOD_DESCRIPTIONS.magicLink}
      </PMText>
      <PMHStack gap={4}>
        {isVSCode ? (
          <VSCodeInstallBadge href={magicLink} />
        ) : (
          <a href={magicLink} data-testid="cursor-install-button">
            <img
              src="https://cursor.com/deeplink/mcp-install-dark.png"
              alt="Add Packmind MCP server to Cursor"
              style={{ maxHeight: 32 }}
            />
          </a>
        )}
      </PMHStack>
    </PMVStack>
  );
};

const JsonMethodContent: React.FunctionComponent<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const config = method.getJsonConfig?.(token, url);
  if (!config) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="faded">
        {METHOD_DESCRIPTIONS.json(method.label)}
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
    // Use type + label to create unique key when multiple methods of same type
    const uniqueKey = methods.length > 1 ? `${type}-multi` : type;

    return {
      value: uniqueKey,
      triggerLabel: firstMethod.label,
      content: (
        <PMVStack gap={4} width="100%" p={4} alignItems="flex-start">
          {methods.length > 1 ? (
            <PMVStack gap={6} width="100%" alignItems="flex-start">
              {methods.map((method, index) => (
                <PMVStack
                  key={index}
                  gap={2}
                  width="100%"
                  alignItems="flex-start"
                >
                  <PMText as="p" fontWeight="bold">
                    {method.label}
                  </PMText>
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
  const availableMethods = useMemo(() => getAvailableMethods(agent), [agent]);

  const tabs = useMemo(() => {
    if (availableMethods.length === 0) return [];
    const methodsByType = groupMethodsByType(availableMethods);
    return createTabsFromMethods(methodsByType, token, url);
  }, [availableMethods, token, url]);

  if (tabs.length === 0) return null;

  const hasSingleMethod = tabs.length === 1;
  const firstTab = tabs[0];

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
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMHStack>
          </PMDialog.Header>
          <PMDialog.Body maxH="70vh" overflowY="auto">
            {hasSingleMethod ? (
              firstTab.content
            ) : (
              <PMTabs width="100%" defaultValue={firstTab.value} tabs={tabs} />
            )}
          </PMDialog.Body>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
