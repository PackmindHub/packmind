import React, { useMemo } from 'react';
import {
  PMDialog,
  PMTabs,
  PMVStack,
  PMText,
  PMBox,
  PMHeading,
  PMInput,
} from '@packmind/ui';
import { useCliLoginCode } from './LocalEnvironmentSetup/hooks';
import {
  InstallCliStep,
  AuthenticateStep,
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
            <PMVStack align="flex-start" gap={4}>
              <PMText as="p">
                Install packages in your repository using the CLI:
              </PMText>

              {(() => {
                if (isLoadingSpaces || isLoadingPackages) {
                  return <PMText color="secondary">Loading packages...</PMText>;
                }
                if (
                  packagesResponse?.packages &&
                  packagesResponse.packages.length > 0
                ) {
                  return (
                    <PMVStack align="flex-start" gap={2} width="full">
                      <PMHeading level="h6">Available packages:</PMHeading>
                      {packagesResponse.packages.map((pkg) => (
                        <PMBox
                          key={pkg.id}
                          p={3}
                          borderRadius="md"
                          backgroundColor="background.secondary"
                          width="full"
                        >
                          <PMVStack align="flex-start" gap={1}>
                            <PMText fontWeight="bold">{pkg.name}</PMText>
                            <PMText fontSize="sm" color="secondary">
                              Slug: {pkg.slug}
                            </PMText>
                            <PMInput
                              value={`packmind-cli install ${pkg.slug}`}
                              readOnly
                            />
                          </PMVStack>
                        </PMBox>
                      ))}
                    </PMVStack>
                  );
                }
                return (
                  <PMText color="secondary">
                    No packages available. Create a package first to deploy it.
                  </PMText>
                );
              })()}
            </PMVStack>
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
