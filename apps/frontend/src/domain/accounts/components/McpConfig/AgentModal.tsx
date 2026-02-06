import React, { useMemo, useState } from 'react';
import {
  PMDialog,
  PMVStack,
  PMTabs,
  PMText,
  PMHStack,
  PMCloseButton,
} from '@packmind/ui';
import { IAgentConfig, IInstallMethod, getAvailableMethods } from './types';
import { MethodContent } from './InstallMethods';
import { StartTrialCommandAgents } from '@packmind/types';
import { OnboardingAgentProvider } from '../../contexts';
import { CantUseMcpModal } from '../trial/CantUseMcpModal';

const TYPE_PRIORITY: Record<string, number> = {
  magicLink: 0,
  cli: 1,
  json: 2,
};

const mapAgentIdToAnalytics = (agentId: string): StartTrialCommandAgents => {
  const mapping: Record<string, StartTrialCommandAgents> = {
    claude: 'claude',
    'github-copilot-vscode': 'vs-code',
    'github-copilot-jetbrains': 'jetbrains',
    cursor: 'cursor',
    continue: 'continue-dev',
    generic: 'other',
  };
  return mapping[agentId] ?? 'other';
};

interface IAgentModalProps {
  agent: IAgentConfig;
  token: string;
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

const createTabsFromMethods = (
  methods: IInstallMethod[],
  token: string,
  url: string,
  onCantUseMcp?: () => void,
) => {
  const sorted = [...methods].sort(
    (a, b) => (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99),
  );

  return sorted.map((method, index) => ({
    value: `${method.type}-${index}`,
    triggerLabel: method.label,
    content: (
      <PMVStack gap={4} width="100%" p={4} alignItems="flex-start">
        <MethodContent
          method={method}
          token={token}
          url={url}
          onCantUseMcp={onCantUseMcp}
        />
      </PMVStack>
    ),
  }));
};

export const AgentModal: React.FunctionComponent<IAgentModalProps> = ({
  agent,
  token,
  url,
  isOpen,
  onClose,
}) => {
  const [isCantUseMcpModalOpen, setIsCantUseMcpModalOpen] = useState(false);
  const availableMethods = useMemo(() => getAvailableMethods(agent), [agent]);

  const handleCantUseMcp = () => setIsCantUseMcpModalOpen(true);

  const tabs = useMemo(() => {
    if (availableMethods.length === 0) return [];
    return createTabsFromMethods(
      availableMethods,
      token,
      url,
      handleCantUseMcp,
    );
  }, [availableMethods, token, url]);

  if (tabs.length === 0) return null;

  return (
    <>
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
              <OnboardingAgentProvider agent={mapAgentIdToAnalytics(agent.id)}>
                <PMTabs width="100%" defaultValue={tabs[0].value} tabs={tabs} />
              </OnboardingAgentProvider>
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
      <CantUseMcpModal
        isOpen={isCantUseMcpModalOpen}
        onClose={() => setIsCantUseMcpModalOpen(false)}
        selectedAgent={mapAgentIdToAnalytics(agent.id)}
      />
    </>
  );
};
