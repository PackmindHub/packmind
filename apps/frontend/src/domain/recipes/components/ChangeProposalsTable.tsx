import {
  PMTable,
  PMTableColumn,
  PMButton,
  PMHStack,
  PMIcon,
  PMConfirmationModal,
} from '@packmind/ui';
import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  OrganizationId,
  RecipeId,
  ScalarUpdatePayload,
  SpaceId,
} from '@packmind/types';
import { getChangeProposalFieldLabel } from '../utils/changeProposalHelpers';
import { formatDate } from '../../../shared/utils/dateUtils';
import { LuCheck, LuCircleX } from 'react-icons/lu';
import { useRejectChangeProposalMutation } from '../api/queries/ChangeProposalsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

type CommandChangeProposal =
  | ChangeProposal<ChangeProposalType.updateCommandName>
  | ChangeProposal<ChangeProposalType.updateCommandDescription>;

const columns: PMTableColumn[] = [
  { key: 'field', header: 'Field', grow: true },
  { key: 'oldValue', header: 'Old value', width: '300px' },
  { key: 'newValue', header: 'New value', width: '300px' },
  { key: 'author', header: 'Author', width: '150px' },
  { key: 'date', header: 'Date', width: '180px' },
  { key: 'actions', header: 'Actions', width: '200px' },
];

interface ChangeProposalsTableProps {
  proposals: ChangeProposal[];
  recipeId: RecipeId;
}

function ActionButtons({
  proposalId,
  recipeId,
}: Readonly<{ proposalId: ChangeProposalId; recipeId: RecipeId }>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const rejectMutation = useRejectChangeProposalMutation();

  const handleReject = () => {
    if (!organization?.id || !spaceId) return;

    rejectMutation.mutate({
      organizationId: organization.id as OrganizationId,
      spaceId: spaceId as SpaceId,
      changeProposalId: proposalId,
      recipeId,
    });
  };

  return (
    <PMHStack gap={2}>
      <PMButton
        size="xs"
        onClick={() => console.log('Accept proposal:', proposalId)}
      >
        <PMIcon>
          <LuCheck />
        </PMIcon>
      </PMButton>
      <PMConfirmationModal
        trigger={
          <PMButton
            variant="secondary"
            size="xs"
            disabled={rejectMutation.isPending}
          >
            <PMIcon>
              <LuCircleX />
            </PMIcon>
          </PMButton>
        }
        title="Reject change proposal"
        message="Are you sure you want to reject this change proposal? This action cannot be undone."
        confirmText="Reject"
        onConfirm={handleReject}
        isLoading={rejectMutation.isPending}
      />
    </PMHStack>
  );
}

export function ChangeProposalsTable({
  proposals,
  recipeId,
}: Readonly<ChangeProposalsTableProps>) {
  const tableData = (proposals as CommandChangeProposal[]).map((proposal) => ({
    field: getChangeProposalFieldLabel(proposal.type),
    oldValue: (proposal.payload as ScalarUpdatePayload).oldValue,
    newValue: (proposal.payload as ScalarUpdatePayload).newValue,
    author: proposal.createdBy,
    date: formatDate(String(proposal.createdAt)),
    actions: <ActionButtons proposalId={proposal.id} recipeId={recipeId} />,
  }));

  return <PMTable columns={columns} data={tableData} />;
}
