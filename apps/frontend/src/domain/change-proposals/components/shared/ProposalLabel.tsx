import { PMText } from '@packmind/ui';
import { ChangeProposalType } from '@packmind/types';
import { getChangeProposalFieldLabel } from '../../utils/changeProposalHelpers';

interface ProposalLabelProps {
  proposalNumber: number;
  proposalType: ChangeProposalType;
}

export function ProposalLabel({
  proposalNumber,
  proposalType,
}: Readonly<ProposalLabelProps>) {
  const fieldLabel = getChangeProposalFieldLabel(proposalType);

  return (
    <PMText fontWeight="medium" fontSize="sm">
      #{proposalNumber} &mdash; {fieldLabel}
    </PMText>
  );
}
