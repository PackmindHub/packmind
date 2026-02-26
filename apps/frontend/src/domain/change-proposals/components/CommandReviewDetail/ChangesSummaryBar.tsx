import { PMBox, PMHStack, PMText } from '@packmind/ui';
import { MultiSegmentProgressBar } from './MultiSegmentProgressBar';

interface ChangesSummaryBarProps {
  totalCount: number;
  pendingCount: number;
  acceptedCount: number;
  dismissedCount: number;
}

export function ChangesSummaryBar({
  totalCount,
  pendingCount,
  acceptedCount,
  dismissedCount,
}: Readonly<ChangesSummaryBarProps>) {
  const segments = [
    { count: acceptedCount, color: 'green.400' },
    { count: dismissedCount, color: 'red.400' },
    { count: pendingCount, color: 'orange.400' },
  ];

  return (
    <PMBox px={6} py={3}>
      <PMHStack justifyContent="space-between" mb={2}>
        <PMHStack gap={3} fontSize="sm" color="fg.subtle">
          <PMText>
            {totalCount} change{totalCount !== 1 ? 's' : ''}
          </PMText>
          <PMHStack gap={1} alignItems="center">
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg="orange.400"
            />
            <PMText>{pendingCount} pending</PMText>
          </PMHStack>
          <PMHStack gap={1} alignItems="center">
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg="green.400"
            />
            <PMText>{acceptedCount} accepted</PMText>
          </PMHStack>
          <PMHStack gap={1} alignItems="center">
            <PMBox width="8px" height="8px" borderRadius="full" bg="red.400" />
            <PMText>{dismissedCount} dismissed</PMText>
          </PMHStack>
        </PMHStack>
        {pendingCount > 0 && (
          <PMText fontSize="sm" color="secondary">
            {pendingCount} pending review
          </PMText>
        )}
      </PMHStack>
      <MultiSegmentProgressBar segments={segments} />
    </PMBox>
  );
}
