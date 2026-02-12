import { PMTable, PMTableColumn } from '@packmind/ui';
import {
  ChangeProposalWithOutdatedStatus,
  RecipeId,
  ScalarUpdatePayload,
} from '@packmind/types';
import { getChangeProposalFieldLabel } from '../utils/changeProposalHelpers';
import { formatDate } from '../../../shared/utils/dateUtils';
import { ChangeProposalActionButtons } from './ChangeProposalActionButtons';

const columns: PMTableColumn[] = [
  { key: 'field', header: 'Field', grow: true },
  { key: 'oldValue', header: 'Old value', width: '300px' },
  { key: 'newValue', header: 'New value', width: '300px' },
  { key: 'author', header: 'Author', width: '150px' },
  { key: 'date', header: 'Date', width: '180px' },
  { key: 'actions', header: 'Actions', width: '200px' },
];

interface ChangeProposalsTableProps {
  proposals: ChangeProposalWithOutdatedStatus[];
  recipeId: RecipeId;
}

export function ChangeProposalsTable({
  proposals,
  recipeId,
}: Readonly<ChangeProposalsTableProps>) {
  const tableData = proposals.map((proposal) => ({
    field: getChangeProposalFieldLabel(proposal.type),
    oldValue: (proposal.payload as ScalarUpdatePayload).oldValue,
    newValue: (proposal.payload as ScalarUpdatePayload).newValue,
    author: proposal.createdBy,
    date: formatDate(String(proposal.createdAt)),
    actions: (
      <ChangeProposalActionButtons
        proposalId={proposal.id}
        recipeId={recipeId}
        outdated={proposal.outdated}
      />
    ),
  }));

  return <PMTable columns={columns} data={tableData} />;
}
