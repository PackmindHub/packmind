import React from 'react';
import { PMBox, PMButton, PMText, PMVStack } from '@packmind/ui';

interface DetectabilitySectionProps {
  onLinterUsageClick: () => void;
  standardName?: string;
}

export const DetectabilitySection: React.FC<DetectabilitySectionProps> = ({
  onLinterUsageClick,
  standardName,
}) => {
  return (
    <PMBox
      border="1px solid"
      borderColor="border.secondary"
      borderRadius="md"
      p={4}
      backgroundColor="background.secondary"
      width="full"
    >
      <PMVStack alignItems="flex-start" gap={2}>
        <PMText fontSize="sm" fontWeight="bold">
          Rule is detectable
        </PMText>
        <PMText fontSize="sm" color="faded">
          Packmind linter will now detect violations of this rules in code where
          standard &apos;{standardName}&apos; is deployed.
        </PMText>
        <PMButton size="sm" variant="outline" onClick={onLinterUsageClick}>
          Linter usage
        </PMButton>
      </PMVStack>
    </PMBox>
  );
};
