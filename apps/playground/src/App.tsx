import {
  PMHeading,
  PMText,
  PMButton,
  PMVStack,
  PMHStack,
  PMBox,
} from '@packmind/ui';

export default function App() {
  return (
    <PMBox padding="8" maxWidth="960px" marginX="auto">
      <PMVStack gap="8" align="stretch">
        <PMHeading size="3xl">Packmind UI Playground</PMHeading>
        <PMText color="secondary">
          Use this space to ideate and prototype UI components.
        </PMText>

        <PMBox
          padding="6"
          borderRadius="md"
          backgroundColor="background.primary"
        >
          <PMVStack gap="4" align="start">
            <PMHeading size="xl">Buttons</PMHeading>
            <PMHStack gap="3">
              <PMButton variant="primary">Primary</PMButton>
              <PMButton variant="outline">Outline</PMButton>
              <PMButton variant="ghost">Ghost</PMButton>
            </PMHStack>
          </PMVStack>
        </PMBox>

        {/* Add your prototypes below */}
      </PMVStack>
    </PMBox>
  );
}
