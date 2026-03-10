import {
  PMAccordion,
  PMHStack,
  PMText,
  PMVStack,
  PMSeparator,
  PMSegmentGroup,
  PMBox,
  PMBadge,
} from '@packmind/ui';
import { StubProposal } from '../../types';
import { StatusDot } from './shared/StatusDot';
import { CardActions } from './shared/CardActions';

const FIELD_LABEL: Record<string, string> = {
  Rules: 'Rule',
  Description: 'Description',
  Name: 'Name',
  Steps: 'Steps',
  Prompt: 'Prompt',
  Files: 'Files',
  Metadata: 'Metadata',
};

export function ProposalAccordionCard({
  proposal,
  number,
  onAccept,
  onDismiss,
  onUndo,
}: {
  proposal: StubProposal;
  number: number;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor="border.tertiary"
      borderRadius="md"
      width="full"
    >
      {/* Card header */}
      <PMAccordion.ItemTrigger px={4} py={3} _hover={{ cursor: 'pointer' }}>
        <PMHStack flex={1} gap={3} alignItems="center">
          <PMAccordion.ItemIndicator />
          <PMText fontWeight="medium" fontSize="sm">
            #{number} &mdash; {FIELD_LABEL[proposal.field] ?? proposal.field}
          </PMText>
          <StatusDot status={proposal.status} />
          <PMHStack flex={1} justifyContent="flex-end">
            <PMText fontSize="xs" color="secondary">
              joan &middot; 2h ago &middot;
            </PMText>
            <PMBadge size="sm" colorPalette="gray">
              base v1
            </PMBadge>
          </PMHStack>
        </PMHStack>
      </PMAccordion.ItemTrigger>

      {/* Card body */}
      <PMAccordion.ItemContent>
        <PMVStack gap={0} alignItems="stretch">
          {/* Toolbar */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMHStack justifyContent="space-between" alignItems="center">
              <PMHStack gap={2} alignItems="center">
                <PMSegmentGroup.Root size="sm" defaultValue="diff">
                  <PMSegmentGroup.Indicator bg="background.tertiary" />
                  {[
                    { label: 'Diff', value: 'diff' },
                    { label: 'Inline', value: 'inline' },
                  ].map((item) => (
                    <PMSegmentGroup.Item
                      key={item.value}
                      value={item.value}
                      _checked={{ color: 'text.primary' }}
                    >
                      <PMSegmentGroup.ItemText>
                        {item.label}
                      </PMSegmentGroup.ItemText>
                      <PMSegmentGroup.ItemHiddenInput />
                    </PMSegmentGroup.Item>
                  ))}
                </PMSegmentGroup.Root>
              </PMHStack>
              <CardActions
                poolStatus={proposal.status}
                onAccept={onAccept}
                onDismiss={onDismiss}
                onUndo={onUndo}
              />
            </PMHStack>
          </PMVStack>

          {/* Diff content placeholder */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMBox
              bg="{colors.background.secondary}"
              borderRadius="md"
              p={4}
              fontFamily="mono"
              fontSize="sm"
            >
              <PMText color="secondary">{proposal.summary}</PMText>
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
