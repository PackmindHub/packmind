import React, { useState } from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMButtonGroup,
  PMVStack,
  PMRadioCard,
  PMTextArea,
  PMField,
  pmToaster,
} from '@packmind/ui';
import { StartTrialCommandAgents } from '@packmind/types';
import { StartTrialAgentPageDataTestIds } from '@packmind/frontend';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { McpUnavailableReason } from '@packmind/proprietary/frontend/domain/amplitude/providers/types';

interface IReasonOption {
  value: McpUnavailableReason;
  label: string;
}

const REASON_OPTIONS: IReasonOption[] = [
  {
    value: McpUnavailableReason.CantUseMcp,
    label: 'I can’t use MCP due to technical or security constraints',
  },
  {
    value: McpUnavailableReason.DontWantMcp,
    label: 'I decided not to use MCP',
  },
  {
    value: McpUnavailableReason.DontKnowMcp,
    label: 'I don’t know what MCP is',
  },
  { value: McpUnavailableReason.Other, label: 'Other' },
];

interface ICantUseMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgent: StartTrialCommandAgents;
}

export const CantUseMcpModal: React.FC<ICantUseMcpModalProps> = ({
  isOpen,
  onClose,
  selectedAgent,
}) => {
  const analytics = useAnalytics();
  const [selectedReason, setSelectedReason] =
    useState<McpUnavailableReason | null>(null);
  const [otherDetails, setOtherDetails] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) return;

    const trimmedDetails = otherDetails.trim();
    analytics.track('mcp_unavailable_feedback', {
      reason: selectedReason,
      selectedAgent,
      ...(selectedReason === McpUnavailableReason.Other &&
        trimmedDetails && { otherDetails: trimmedDetails }),
    });

    pmToaster.create({
      type: 'success',
      title: 'Thank you for your feedback',
      description: 'Your feedback helps us improve Packmind.',
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedReason(null);
    setOtherDetails('');
    onClose();
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={false}
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => {
        if (!details.open) {
          handleClose();
        }
      }}
      size="md"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content
          data-testid={StartTrialAgentPageDataTestIds.CantUseMcpModal}
        >
          <PMDialog.Header>
            <PMDialog.Title>
              What’s stopping you from using our MCP server?
            </PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} width="full" alignItems="stretch">
              <PMRadioCard.Root
                size="sm"
                variant="outline"
                value={selectedReason ?? undefined}
                onValueChange={(e) =>
                  setSelectedReason(e.value as McpUnavailableReason)
                }
              >
                <PMVStack gap={2}>
                  {REASON_OPTIONS.map((option) => (
                    <PMRadioCard.Item
                      key={option.value}
                      value={option.value}
                      data-testid={`${StartTrialAgentPageDataTestIds.CantUseMcpReasonOption}.${option.value}`}
                      width="full"
                    >
                      <PMRadioCard.ItemHiddenInput />
                      <PMRadioCard.ItemControl>
                        <PMRadioCard.ItemContent>
                          <PMRadioCard.ItemText>
                            {option.label}
                          </PMRadioCard.ItemText>
                        </PMRadioCard.ItemContent>
                        <PMRadioCard.ItemIndicator />
                      </PMRadioCard.ItemControl>
                    </PMRadioCard.Item>
                  ))}
                </PMVStack>
              </PMRadioCard.Root>

              {selectedReason === McpUnavailableReason.Other && (
                <PMField.Root>
                  <PMField.Label>Please provide more details</PMField.Label>
                  <PMTextArea
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="Tell us more about why you can't use MCP..."
                    rows={3}
                    data-testid={
                      StartTrialAgentPageDataTestIds.CantUseMcpOtherInput
                    }
                  />
                </PMField.Root>
              )}
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size="sm">
              <PMButton
                variant="tertiary"
                onClick={handleClose}
                data-testid={
                  StartTrialAgentPageDataTestIds.CantUseMcpCancelButton
                }
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!selectedReason}
                data-testid={
                  StartTrialAgentPageDataTestIds.CantUseMcpSubmitButton
                }
              >
                Submit Feedback
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
