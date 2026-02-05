import React from 'react';
import {
  PMVStack,
  PMText,
  PMBox,
  PMHeading,
  PMGrid,
  PMGridItem,
} from '@packmind/ui';
import { CopiableTextField } from '../../../../../shared/components/inputs';
import { StepHeader } from '../components';

interface IDistributeStepProps {
  packages?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  isLoading?: boolean;
}

export const DistributeStep: React.FC<IDistributeStepProps> = ({
  packages = [],
  isLoading = false,
}) => {
  let content: React.ReactNode;
  if (isLoading) {
    content = <PMText color="secondary">Loading packages...</PMText>;
  } else if (packages.length > 0) {
    content = (
      <PMVStack align="flex-start" gap={4} width="full">
        <PMHeading level="h6">Available packages</PMHeading>

        <PMGrid width="full" templateColumns={'1fr 1fr'} gap={4}>
          {packages.map((pkg) => (
            <PMGridItem
              key={pkg.id}
              p={3}
              borderRadius="md"
              backgroundColor="background.secondary"
            >
              <PMVStack align="flex-start" gap={1}>
                <PMText fontWeight="bold">{pkg.name}</PMText>
                <PMBox w="full">
                  <CopiableTextField
                    label={
                      'Run this command in your terminal to install the package'
                    }
                    value={`packmind-cli install ${pkg.slug}`}
                  />
                </PMBox>
              </PMVStack>
            </PMGridItem>
          ))}
        </PMGrid>
      </PMVStack>
    );
  } else {
    content = (
      <PMText color="secondary">
        No packages available. Create a package first to deploy it.
      </PMText>
    );
  }

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <StepHeader
        title="Distribute packages"
        description="Install packages in your repository using the CLI."
      />
      {content}
    </PMVStack>
  );
};
