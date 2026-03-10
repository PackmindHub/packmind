import { PMBox } from '@packmind/ui';
import { ProposalStatus } from '../../../types';

const STATUS_DOT_COLOR: Record<ProposalStatus, string> = {
  pending: 'yellow.400',
  accepted: 'green.400',
  rejected: 'red.400',
};

export function StatusDot({ status }: { status: ProposalStatus }) {
  return (
    <PMBox
      width="10px"
      height="10px"
      borderRadius="full"
      flexShrink={0}
      bg={STATUS_DOT_COLOR[status]}
    />
  );
}
