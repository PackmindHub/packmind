import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuBookOpen, LuPlug, LuPlus } from 'react-icons/lu';

export function EmptyMarketplaceState() {
  return (
    <PMBox paddingX={10} paddingY={12}>
      <PMVStack gap={5} align="start" maxW="560px">
        <PMBox
          width="44px"
          height="44px"
          borderRadius="md"
          bg="background.tertiary"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="branding.primary"
        >
          <PMIcon fontSize="lg">
            <LuPlug />
          </PMIcon>
        </PMBox>
        <PMVStack gap={2} align="start">
          <PMText fontSize="md" fontWeight="semibold" color="primary">
            No plugins yet
          </PMText>
          <PMText fontSize="sm" color="secondary" lineHeight={1.55}>
            A plugin bundles the standards, commands, and skills this
            marketplace publishes to consuming repos. Add one to start shipping
            to Claude Code and Copilot.
          </PMText>
        </PMVStack>
        <PMHStack gap={3}>
          <PMButton variant="primary" size="sm">
            <PMIcon fontSize="sm">
              <LuPlus />
            </PMIcon>
            Add plugin
          </PMButton>
          <PMButton variant="secondary" size="sm">
            <PMIcon fontSize="sm">
              <LuBookOpen />
            </PMIcon>
            Read the docs
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}
