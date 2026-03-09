import {
  PMPopover,
  PMButton,
  PMText,
  PMBox,
  PMHStack,
  PMVStack,
  PMAlert,
} from '@packmind/ui';
import { StatusDot } from './StatusDot';

interface ApplyConfirmationPopoverProps {
  acceptedCount: number;
  dismissedCount: number;
  pendingCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function ApplyConfirmationPopover({
  acceptedCount,
  dismissedCount,
  pendingCount,
  hasPooledDecisions,
  isSaving,
  onSave,
}: Readonly<ApplyConfirmationPopoverProps>) {
  return (
    <PMPopover.Root
      positioning={{ placement: 'bottom-end', offset: { mainAxis: 9 } }}
    >
      <PMPopover.Trigger asChild>
        <PMButton
          size="sm"
          variant="primary"
          disabled={!hasPooledDecisions || isSaving}
          loading={isSaving}
          loadingText="Applying..."
        >
          Apply ({acceptedCount})
        </PMButton>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content width="400px" bg="background.tertiary">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body p={5}>
            <PMBox mb={4}>
              <PMText fontWeight="semibold">Review summary</PMText>
            </PMBox>

            <PMVStack gap={2} mb={4} align="stretch">
              <PMHStack justifyContent="space-between">
                <PMHStack gap={2} alignItems="center">
                  <StatusDot status="accepted" />
                  <PMText>Accepted</PMText>
                </PMHStack>
                <PMText fontWeight="semibold">{acceptedCount}</PMText>
              </PMHStack>

              <PMHStack justifyContent="space-between">
                <PMHStack gap={2} alignItems="center">
                  <StatusDot status="dismissed" />
                  <PMText>Dismissed</PMText>
                </PMHStack>
                <PMText fontWeight="semibold">{dismissedCount}</PMText>
              </PMHStack>

              <PMHStack justifyContent="space-between">
                <PMHStack gap={2} alignItems="center">
                  <StatusDot status="pending" />
                  <PMText>Still pending</PMText>
                </PMHStack>
                <PMText fontWeight="semibold">{pendingCount}</PMText>
              </PMHStack>
            </PMVStack>

            {pendingCount > 0 && (
              <PMBox mb={4}>
                <PMAlert.Root status="warning" size="sm">
                  <PMAlert.Indicator />
                  <PMAlert.Title>
                    {pendingCount} change(s) still pending. Submitting now will
                    leave them unreviewed.
                  </PMAlert.Title>
                </PMAlert.Root>
              </PMBox>
            )}

            <PMText mb={4}>
              {acceptedCount} change(s) will be applied and {dismissedCount}{' '}
              will be dismissed.
            </PMText>

            <PMBox mt={5}>
              <PMHStack justifyContent="flex-end" gap={2}>
                <PMPopover.CloseTrigger asChild>
                  <PMButton size="sm" variant="outline">
                    Cancel
                  </PMButton>
                </PMPopover.CloseTrigger>
                <PMPopover.CloseTrigger asChild>
                  <PMButton size="sm" variant="primary" onClick={onSave}>
                    Confirm
                  </PMButton>
                </PMPopover.CloseTrigger>
              </PMHStack>
            </PMBox>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
}
