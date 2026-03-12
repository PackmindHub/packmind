import {
  PMIcon,
  PMBox,
  PMHStack,
  PMButton,
  PMText,
  PMMenu,
  PMPortal,
} from '@packmind/ui';
import { LuBuilding } from 'react-icons/lu';

export function StubOrgSelector() {
  return (
    <PMMenu.Root positioning={{ placement: 'bottom-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          width="full"
          justifyContent="flex-start"
          paddingY="3"
          paddingX="2"
        >
          <PMHStack overflow="hidden">
            <PMIcon color="text.tertiary">
              <LuBuilding />
            </PMIcon>
            <PMBox
              maxWidth="full"
              textOverflow="ellipsis"
              overflow="hidden"
              color="text.secondary"
            >
              Acme Company
            </PMBox>
          </PMHStack>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="other-org" cursor="pointer">
              <PMText color="secondary">Other Organization</PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
