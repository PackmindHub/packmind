import { Text } from '@chakra-ui/react';
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
  const isRemoval =
    proposalType === ChangeProposalType.removeStandard ||
    proposalType === ChangeProposalType.removeCommand ||
    proposalType === ChangeProposalType.removeSkill;

  return (
    <PMText fontWeight="medium" fontSize="sm">
      #{proposalNumber} &mdash;{' '}
      {isRemoval ? (
        <Text as="span" color="red.300">
          {fieldLabel}
        </Text>
      ) : (
        fieldLabel
      )}
    </PMText>
  );
}
