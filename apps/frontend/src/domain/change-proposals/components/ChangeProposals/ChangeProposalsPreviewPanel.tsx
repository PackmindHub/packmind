import { PMBox, PMVStack, PMText } from '@packmind/ui';
import {
  ChangeProposalType,
  ChangeProposalWithOutdatedStatus,
  ScalarUpdatePayload,
} from '@packmind/types';
import { DiffHighlight } from '../../../recipes/components/DiffHighlight';

interface ChangeProposalsPreviewPanelProps {
  recipe: { name: string; content: string } | null;
  focusedProposal: ChangeProposalWithOutdatedStatus | null;
}

export function ChangeProposalsPreviewPanel({
  recipe,
  focusedProposal,
}: ChangeProposalsPreviewPanelProps) {
  if (!recipe) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <PMText>Click on a proposal to preview the change</PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={4} align="stretch">
      <PMBox>
        {focusedProposal?.type === ChangeProposalType.updateCommandName ? (
          <DiffHighlight
            oldText={(focusedProposal.payload as ScalarUpdatePayload).oldValue}
            newText={(focusedProposal.payload as ScalarUpdatePayload).newValue}
          />
        ) : (
          <PMText fontSize="lg" fontWeight="semibold">
            {recipe.name}
          </PMText>
        )}
      </PMBox>
      <PMBox>
        {focusedProposal?.type ===
        ChangeProposalType.updateCommandDescription ? (
          <DiffHighlight
            oldText={(focusedProposal.payload as ScalarUpdatePayload).oldValue}
            newText={(focusedProposal.payload as ScalarUpdatePayload).newValue}
          />
        ) : (
          <PMText whiteSpace="pre-wrap">{recipe.content}</PMText>
        )}
      </PMBox>
    </PMVStack>
  );
}
