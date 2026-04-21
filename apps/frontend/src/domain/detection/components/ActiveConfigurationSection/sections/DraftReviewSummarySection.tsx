import React from 'react';
import {
  IPMButtonProps,
  PMButton,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';

type DraftReviewSummarySectionProps = {
  draftVersion?: number | string | null;
  mainButtonProps: IPMButtonProps | null;
};

export const DraftReviewSummarySection: React.FC<
  DraftReviewSummarySectionProps
> = ({ draftVersion, mainButtonProps }) => {
  return (
    <PMHStack justifyContent="space-between" alignItems="center" width="full">
      <PMVStack alignItems="flex-start" gap={2}>
        {draftVersion ? (
          <PMText fontSize="sm" color="faded">
            Draft v{draftVersion} requires review
          </PMText>
        ) : (
          <PMText fontSize="sm" color="faded">
            Draft requires review
          </PMText>
        )}
      </PMVStack>
      {mainButtonProps && (
        <PMButton size="sm" variant="outline" {...mainButtonProps} />
      )}
    </PMHStack>
  );
};
