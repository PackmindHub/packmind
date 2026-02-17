import { diffWords } from 'diff';
import { PMBox, PMHStack, PMIconButton, PMText, PMButton } from '@packmind/ui';
import { ScalarUpdatePayload } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { LuCheck, LuX, LuUndo2 } from 'react-icons/lu';

interface InlineDiffContentProps {
  proposal: ChangeProposalWithConflicts;
  isReviewing: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onPoolAccept: () => void;
  onPoolReject: () => void;
  onUndoPool: () => void;
  onReviewProposal: () => void;
}

export function InlineDiffContent({
  proposal,
  isReviewing,
  isAccepted,
  isRejected,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
  onReviewProposal,
}: Readonly<InlineDiffContentProps>) {
  const payload = proposal.payload as ScalarUpdatePayload;
  const changes = diffWords(payload.oldValue, payload.newValue);
  const isPooled = isAccepted || isRejected;

  return (
    <PMBox
      borderLeft="3px solid"
      borderRadius="md"
      paddingLeft={3}
      paddingY={2}
      paddingRight={2}
      cursor="pointer"
      background={isReviewing ? 'background.tertiary' : 'transparent'}
      opacity={isRejected ? 0.6 : 1}
      onClick={onReviewProposal}
      _hover={{ background: 'background.secondary' }}
    >
      <PMHStack justify="space-between" align="start" gap={2}>
        <PMBox flex={1} minW={0}>
          <PMText whiteSpace="pre-wrap">
            {changes.map((change, i) => {
              if (change.added) {
                return (
                  <PMText key={i} as="span" paddingX={0.5} borderRadius="sm">
                    {change.value}
                  </PMText>
                );
              }
              if (change.removed) {
                return (
                  <PMText
                    key={i}
                    as="span"
                    textDecoration="line-through"
                    paddingX={0.5}
                    borderRadius="sm"
                  >
                    {change.value}
                  </PMText>
                );
              }
              return (
                <PMText key={i} as="span">
                  {change.value}
                </PMText>
              );
            })}
          </PMText>
        </PMBox>

        <PMHStack gap={1} flexShrink={0} onClick={(e) => e.stopPropagation()}>
          {isPooled ? (
            <PMButton
              size="xs"
              variant="ghost"
              onClick={onUndoPool}
              aria-label="Undo decision"
            >
              <LuUndo2 />
              Undo
            </PMButton>
          ) : (
            <>
              <PMIconButton
                aria-label="Accept proposal"
                size="xs"
                variant="ghost"
                colorPalette="green"
                onClick={onPoolAccept}
              >
                <LuCheck />
              </PMIconButton>
              <PMIconButton
                aria-label="Reject proposal"
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={onPoolReject}
              >
                <LuX />
              </PMIconButton>
            </>
          )}
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}
