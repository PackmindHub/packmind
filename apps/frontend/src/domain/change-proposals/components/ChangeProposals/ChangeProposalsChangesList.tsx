import { PMBox, PMCheckbox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalWithOutdatedStatus,
  ScalarUpdatePayload,
} from '@packmind/types';
import { getChangeProposalFieldLabel } from '../../../recipes/utils/changeProposalHelpers';

function truncateValue(value: string, maxLength = 40): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '...';
}

interface ChangeProposalsChangesListProps {
  proposals: ChangeProposalWithOutdatedStatus[];
  selectedProposalIds: Set<ChangeProposalId>;
  focusedProposalId: ChangeProposalId | null;
  onToggleProposal: (proposalId: ChangeProposalId, checked: boolean) => void;
  onFocusProposal: (proposalId: ChangeProposalId) => void;
}

export function ChangeProposalsChangesList({
  proposals,
  selectedProposalIds,
  focusedProposalId,
  onToggleProposal,
  onFocusProposal,
}: ChangeProposalsChangesListProps) {
  return (
    <PMBox display="flex" flexDirection="column">
      <PMBox overflowY="auto" flex={1}>
        <PMVStack gap={1}>
          {proposals.map((proposal) => {
            const payload = proposal.payload as ScalarUpdatePayload;
            const isChecked = selectedProposalIds.has(proposal.id);
            const isFocused = focusedProposalId === proposal.id;

            return (
              <PMBox
                key={proposal.id}
                borderRadius="md"
                border="1px solid"
                borderColor="border.tertiary"
                cursor="pointer"
                width="full"
                background={isFocused ? 'background.tertiary' : 'none'}
                p={2}
                onClick={() => onFocusProposal(proposal.id)}
              >
                <PMHStack gap={2} align="start">
                  <PMBox onClick={(e) => e.stopPropagation()} pt={1}>
                    <PMCheckbox
                      checked={isChecked}
                      onCheckedChange={(e) =>
                        onToggleProposal(proposal.id, e.checked === true)
                      }
                    />
                  </PMBox>
                  <PMVStack gap={0} flex={1} minW={0}>
                    <PMText fontSize="sm" fontWeight="medium">
                      {getChangeProposalFieldLabel(proposal.type)}
                    </PMText>
                    <PMText fontSize="xs" color="secondary" truncate>
                      {truncateValue(payload.oldValue)} {'->'}{' '}
                      {truncateValue(payload.newValue)}
                    </PMText>
                  </PMVStack>
                </PMHStack>
              </PMBox>
            );
          })}
          {proposals.length === 0 && (
            <PMBox py={4} textAlign="center">
              <PMText fontSize="sm">
                No pending proposals for this command
              </PMText>
            </PMBox>
          )}
        </PMVStack>
      </PMBox>
    </PMBox>
  );
}
