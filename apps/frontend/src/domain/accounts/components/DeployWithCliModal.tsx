import React, { useMemo } from 'react';
import { PMDialog, PMTabs, PMVStack } from '@packmind/ui';
import { useCliLoginCode } from './LocalEnvironmentSetup/hooks';
import {
  InstallCliStep,
  AuthenticateStep,
  DistributeStep,
} from './LocalEnvironmentSetup/steps';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PMVStack align="flex-start" gap={4} paddingTop={4}>
    {children}
  </PMVStack>
);

interface DeployWithCliModalProps {
  open: boolean;
  onClose: () => void;
}

export const DeployWithCliModal: React.FC<DeployWithCliModalProps> = ({
  open,
  onClose,
}) => {
  const { organization } = useAuthContext();
  const { data: spaces, isLoading: isLoadingSpaces } = useGetSpacesQuery();

  // Use first space or global space as fallback
  const targetSpace = spaces?.[0];

  const { data: packagesResponse, isLoading: isLoadingPackages } =
    useListPackagesBySpaceQuery(targetSpace?.id, organization?.id);

  const { loginCode, codeExpiresAt, isGenerating, regenerate } =
    useCliLoginCode();

  const tabs = useMemo(
    () => [
      {
        value: 'install-cli',
        triggerLabel: '1. Install CLI',
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
        triggerLabel: '2. Authenticate',
        content: (
          <TabContent>
            <AuthenticateStep />
          </TabContent>
        ),
      },
      {
        value: 'distribute',
        triggerLabel: '3. Distribute',
        content: (
          <TabContent>
            <DistributeStep
              packages={packagesResponse?.packages}
              isLoading={isLoadingSpaces || isLoadingPackages}
            />
          </TabContent>
        ),
      },
    ],
    [
      loginCode,
      codeExpiresAt,
      isGenerating,
      regenerate,
      packagesResponse,
      isLoadingPackages,
      isLoadingSpaces,
    ],
  );

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => !details.open && onClose()}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content maxWidth="800px">
          <PMDialog.Header>
            <PMDialog.Title>Deploy with CLI</PMDialog.Title>
            <PMDialog.CloseTrigger />
          </PMDialog.Header>
          <PMDialog.Body>
            <PMTabs defaultValue="install-cli" width="full" tabs={tabs} />
          </PMDialog.Body>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
