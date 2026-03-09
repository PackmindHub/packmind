import {
  PMHeading,
  PMText,
  PMButton,
  PMVStack,
  PMHStack,
  PMBox,
} from '@packmind/ui';

export default function ButtonsPrototype() {
  return (
    <PMVStack gap="8" align="stretch">
      <PMText color="secondary">
        Use this space to ideate and prototype UI components.
      </PMText>

      <PMBox padding="6" borderRadius="md" backgroundColor="background.primary">
        <PMVStack gap="4" align="start">
          <PMHeading size="xl">Buttons</PMHeading>
          <PMHStack gap="3">
            <PMButton variant="primary">Primary</PMButton>
            <PMButton variant="outline">Outline</PMButton>
            <PMButton variant="ghost">Ghost</PMButton>
          </PMHStack>
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
}
