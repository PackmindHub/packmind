import { PMBox, PMHStack, PMSkeleton, PMVStack } from '@packmind/ui';

export function LoadingState() {
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
          <PMHStack justify="space-between">
            <PMSkeleton height="11px" width="50px" />
            <PMSkeleton height="11px" width="20px" />
          </PMHStack>
          <PMSkeleton height="32px" width="100%" />
        </PMVStack>
        {[0, 1, 2, 3, 4].map((i) => (
          <PMVStack
            key={i}
            gap={1.5}
            paddingX={3}
            paddingY={2.5}
            align="stretch"
            borderBottom="1px solid"
            borderColor="border.tertiary"
          >
            <PMHStack justify="space-between">
              <PMSkeleton height="14px" width="160px" />
              <PMSkeleton height="11px" width="40px" />
            </PMHStack>
            <PMSkeleton height="11px" width="100px" />
          </PMVStack>
        ))}
      </PMBox>
      <PMBox flex="1" minW={0} bg="background.primary">
        <PMVStack
          gap={6}
          align="stretch"
          paddingX={8}
          paddingY={6}
          maxW="960px"
        >
          <PMVStack gap={2} align="start">
            <PMSkeleton height="24px" width="280px" />
            <PMSkeleton height="14px" width="380px" />
          </PMVStack>
          <PMVStack gap={2} align="stretch">
            <PMSkeleton height="14px" width="100%" />
            <PMSkeleton height="14px" width="92%" />
            <PMSkeleton height="14px" width="60%" />
          </PMVStack>
          <PMVStack gap={3} align="stretch">
            <PMSkeleton height="11px" width="70px" />
            <PMSkeleton height="18px" width="280px" />
          </PMVStack>
          <PMVStack gap={2} align="stretch">
            <PMSkeleton height="11px" width="120px" />
            {[0, 1, 2, 3].map((i) => (
              <PMHStack key={i} gap={3} paddingY={2}>
                <PMVStack gap={1.5} align="stretch" flex={1}>
                  <PMSkeleton height="14px" width="240px" />
                  <PMSkeleton height="11px" width="360px" />
                </PMVStack>
              </PMHStack>
            ))}
          </PMVStack>
        </PMVStack>
      </PMBox>
    </PMHStack>
  );
}
