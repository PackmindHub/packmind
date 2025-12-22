import React, { useMemo } from 'react';
import {
  PMDialog,
  PMVStack,
  PMTabs,
  PMText,
  PMHStack,
  PMCloseButton,
} from '@packmind/ui';
import {
  IAgentConfig,
  IInstallMethod,
  groupMethodsByType,
  getAvailableMethods,
} from './types';
import { MethodContent } from './InstallMethods';

interface IAgentModalProps {
  agent: IAgentConfig;
  token: string;
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

const createTabsFromMethods = (
  methodsByType: Record<string, IInstallMethod[]>,
  token: string,
  url: string,
) => {
  // Define the desired order: magicLink (One-click install), cli (CLI), json (JSON)
  const orderedTypes = ['magicLink', 'cli', 'json'];

  return orderedTypes
    .filter((type) => methodsByType[type]) // Only include types that exist
    .map((type) => {
      const methods = methodsByType[type];
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
