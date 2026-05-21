import { PMBox, PMSkeleton, PMHStack } from '@packmind/ui';

function SkeletonBlock() {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="lg"
      paddingX={4}
      paddingY={3}
    >
      <PMHStack gap={3} align="center">
        <PMSkeleton width="28px" height="28px" borderRadius="sm" />
        <PMBox flex={1}>
          <PMSkeleton height="16px" width="40%" marginBottom={2} />
          <PMSkeleton height="12px" width="25%" />
        </PMBox>
        <PMSkeleton height="12px" width="80px" />
      </PMHStack>
    </PMBox>
  );
}

export function LoadingSkeleton() {
  return (
    <PMBox display="flex" flexDirection="column" gap={3}>
      <PMHStack gap={2} align="center" marginBottom={2}>
        <PMSkeleton height="20px" width="160px" />
      </PMHStack>
      <SkeletonBlock />
      <SkeletonBlock />
      <SkeletonBlock />
    </PMBox>
  );
}
