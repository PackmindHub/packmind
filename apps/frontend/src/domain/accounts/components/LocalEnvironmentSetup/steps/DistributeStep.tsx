import React from 'react';
import { PMVStack, PMText, PMBox, PMHeading, PMInput } from '@packmind/ui';
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
  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <StepHeader
        title="Distribute packages"
        description="Install packages in your repository using the CLI."
      />

      {isLoading ? (
        <PMText color="secondary">Loading packages...</PMText>
      ) : packages.length > 0 ? (
        <PMVStack align="flex-start" gap={4} width="full">
          <PMHeading level="h6">Available packages:</PMHeading>
          {packages.map((pkg) => (
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
                <PMInput value={`packmind-cli install ${pkg.slug}`} readOnly />
              </PMVStack>
            </PMBox>
          ))}
        </PMVStack>
      ) : (
        <PMText color="secondary">
          No packages available. Create a package first to deploy it.
        </PMText>
      )}
    </PMVStack>
  );
};
