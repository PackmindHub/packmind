import { PMBox } from '@packmind/ui';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

const colorByStatus: Record<PoolStatus, string> = {
  pending: 'orange.400',
  accepted: 'green.400',
  dismissed: 'red.400',
};

interface StatusDotProps {
  status: PoolStatus;
}

export function StatusDot({ status }: Readonly<StatusDotProps>) {
  return (
    <PMBox
      width="10px"
      height="10px"
      borderRadius="full"
      flexShrink={0}
      bg={colorByStatus[status]}
    />
  );
}
