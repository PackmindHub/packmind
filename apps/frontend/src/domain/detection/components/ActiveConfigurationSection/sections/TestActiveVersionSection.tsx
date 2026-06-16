import React from 'react';
import { PMButton, PMText, PMVStack } from '@packmind/ui';

interface TestActiveVersionSectionProps {
  onTestClick: () => void;
}

export const TestActiveVersionSection: React.FC<
  TestActiveVersionSectionProps
> = ({ onTestClick }) => {
  return (
    <PMVStack alignItems="flex-start" gap={2}>
      <PMText fontSize="sm" fontWeight="medium">
        Test active version
      </PMText>
      <PMText fontSize="sm" color="faded">
        Test current linter configuration for this rule on your code.
      </PMText>
      <PMButton size="2xs" variant="tertiary" onClick={onTestClick}>
        Test
      </PMButton>
    </PMVStack>
  );
};
