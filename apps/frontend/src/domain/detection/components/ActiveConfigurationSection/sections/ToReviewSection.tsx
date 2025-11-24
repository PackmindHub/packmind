import React from 'react';
import {
  PMBox,
  PMButton,
  PMList,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';

interface ToReviewSectionProps {
  onGenerateProgramClick: () => void;
  isGenerating?: boolean;
}

export const ToReviewSection: React.FC<ToReviewSectionProps> = ({
  onGenerateProgramClick,
  isGenerating = false,
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
        <PMText fontSize="sm" fontWeight="medium">
          Program is outdated
        </PMText>
        <PMText fontSize="sm" color="faded">
          Active version of the program does not match rule specifications
          anymore.
        </PMText>
        <PMList.Root as="ul" listStyle="disc" pl={4}>
          <PMList.Item>
            <PMText fontSize="sm" color="faded">
              Code examples have changed
            </PMText>
          </PMList.Item>
          <PMList.Item>
            <PMText fontSize="sm" color="faded">
              Detectability clues have changed
            </PMText>
          </PMList.Item>
        </PMList.Root>
        <PMTooltip
          label="Running generation will create a draft to ensure your current linter configuration does not break"
          placement="top"
        >
          <PMButton
            size="sm"
            variant="outline"
            onClick={onGenerateProgramClick}
            loading={isGenerating}
            disabled={isGenerating}
          >
            Generate new program
          </PMButton>
        </PMTooltip>
      </PMVStack>
    </PMBox>
  );
};
