import React, { useMemo } from 'react';
import { PMTabs, PMVStack } from '@packmind/ui';
import { useCliLoginCode } from './hooks';
import { InstallCliStep, AuthenticateStep, ConnectAiStep } from './steps';

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PMVStack align="flex-start" gap={4} paddingTop={4}>
    {children}
  </PMVStack>
);

export const LocalEnvironmentSetup: React.FC = () => {
  const { loginCode, codeExpiresAt, isGenerating, regenerate } =
    useCliLoginCode();

  const tabs = useMemo(
    () => [
      {
        value: 'install-cli',
        triggerLabel: 'Install CLI',
        content: (
          <TabContent>
            <InstallCliStep
              loginCode={loginCode}
              isGeneratingCode={isGenerating}
              codeExpiresAt={codeExpiresAt}
              onRegenerateCode={regenerate}
            />
          </TabContent>
        ),
      },
      {
        value: 'authenticate',
        triggerLabel: 'Authenticate',
        content: (
          <TabContent>
            <AuthenticateStep />
          </TabContent>
        ),
      },
      {
        value: 'connect-ai',
        triggerLabel: 'Connect AI',
        content: (
          <TabContent>
            <ConnectAiStep />
          </TabContent>
        ),
      },
    ],
    [loginCode, codeExpiresAt, isGenerating, regenerate],
  );

  return <PMTabs defaultValue="install-cli" width="full" tabs={tabs} />;
};
