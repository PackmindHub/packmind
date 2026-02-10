import {
  PMTable,
  PMTableColumn,
  PMButton,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  ScalarUpdatePayload,
} from '@packmind/types';
import { getChangeProposalFieldLabel } from '../utils/changeProposalHelpers';
import { LuCheck, LuCircleX } from 'react-icons/lu';

type CommandChangeProposal =
  | ChangeProposal<ChangeProposalType.updateCommandName>
  | ChangeProposal<ChangeProposalType.updateCommandDescription>;

const columns: PMTableColumn[] = [
  { key: 'field', header: 'Field', grow: true },
  { key: 'oldValue', header: 'Old value', width: '300px' },
  { key: 'newValue', header: 'New value', width: '300px' },
  { key: 'author', header: 'Author', width: '150px' },
  { key: 'actions', header: 'Actions', width: '200px' },
];

interface ChangeProposalsTableProps {
  proposals: ChangeProposal[];
}

function ActionButtons({
  proposalId,
}: Readonly<{ proposalId: ChangeProposalId }>) {
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
      <PMButton
        variant="secondary"
        size="xs"
        onClick={() => console.log('Reject proposal:', proposalId)}
      >
        <PMIcon>
          <LuCircleX />
        </PMIcon>
      </PMButton>
    </PMHStack>
  );
}

export function ChangeProposalsTable({
  proposals,
}: Readonly<ChangeProposalsTableProps>) {
  const tableData = (proposals as CommandChangeProposal[]).map((proposal) => ({
    field: getChangeProposalFieldLabel(proposal.type),
    oldValue: (proposal.payload as ScalarUpdatePayload).oldValue,
    newValue: (proposal.payload as ScalarUpdatePayload).newValue,
    author: proposal.createdBy,
    actions: <ActionButtons proposalId={proposal.id} />,
  }));

  return <PMTable columns={columns} data={tableData} />;
}
