import React from 'react';
import { PMBox, PMButton, PMText, PMVStack } from '@packmind/ui';

interface DetectabilitySectionProps {
  standardName?: string;
}

const LINTER_DOC_URL = 'https://packmindhub.github.io/packmind/linter';

export const DetectabilitySection: React.FC<DetectabilitySectionProps> = ({
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
        <PMButton size="sm" variant="outline" asChild>
          <a href={LINTER_DOC_URL} target="_blank" rel="noopener noreferrer">
            Linter usage
          </a>
        </PMButton>
      </PMVStack>
    </PMBox>
  );
};
