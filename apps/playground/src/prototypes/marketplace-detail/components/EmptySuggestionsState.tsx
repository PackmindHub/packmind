import { PMBox, PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuInbox } from 'react-icons/lu';

export function EmptySuggestionsState() {
  return (
    <PMHStack gap={0} align="stretch" minH="640px">
      <PMBox
        width="320px"
        flexShrink={0}
        bg="background.primary"
        borderRightWidth="1px"
        borderColor="border.tertiary"
        display="flex"
        flexDirection="column"
      >
        <PMVStack
          gap={2}
          paddingX={3}
          paddingY={3}
          align="stretch"
          borderBottomWidth="1px"
          borderColor="border.tertiary"
        >
          <PMText
            fontSize="11px"
            color="text.faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Suggestions
          </PMText>
        </PMVStack>
      </PMBox>
      <PMBox flex="1" minW={0} paddingX={10} paddingY={12}>
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
              <LuInbox />
            </PMIcon>
          </PMBox>
          <PMVStack gap={2} align="start">
            <PMText fontSize="md" fontWeight="semibold" color="primary">
              No suggestions yet
            </PMText>
            <PMText fontSize="sm" color="secondary" lineHeight={1.55}>
              When a space member proposes a plugin for this marketplace, it
              appears here for your review. You can approve it into the
              marketplace, request changes, or reject it with a reason.
            </PMText>
          </PMVStack>
        </PMVStack>
      </PMBox>
    </PMHStack>
  );
}
