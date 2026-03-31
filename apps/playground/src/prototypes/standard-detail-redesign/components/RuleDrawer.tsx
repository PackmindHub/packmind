import {
  PMDrawer,
  PMHStack,
  PMPortal,
  PMVStack,
  PMBadge,
  PMCloseButton,
} from '@packmind/ui';
import { MockRule } from '../types';
import { LinterSection } from './LinterSection';

type RuleDrawerProps = {
  rule: MockRule;
  ruleIndex: number;
  open: boolean;
  onClose: () => void;
};

export function RuleDrawer({
  rule,
  ruleIndex,
  open,
  onClose,
}: RuleDrawerProps) {
  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="xl"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header
              borderBottom="1px solid"
              borderColor="border.tertiary"
            >
              <PMVStack gap={1} align="stretch" flex={1}>
                <PMHStack gap={2} align="center">
                  <PMBadge variant="outline" size="xs" colorPalette="gray">
                    Rule {ruleIndex + 1}
                  </PMBadge>
                </PMHStack>
                <PMDrawer.Title
                  fontSize="md"
                  fontWeight="semibold"
                  lineHeight="tall"
                >
                  {rule.content}
                </PMDrawer.Title>
              </PMVStack>
            </PMDrawer.Header>

            <PMDrawer.Body padding={5}>
              <LinterSection rule={rule} />
            </PMDrawer.Body>

            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
