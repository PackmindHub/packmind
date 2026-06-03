import { PMBox, PMHStack } from '@packmind/ui';

export function LoadingSkeleton() {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.primary"
    >
      {[0, 1, 2, 3].map((i) => (
        <PMHStack
          key={i}
          gap={3}
          paddingX={4}
          paddingY={4}
          borderBottom={i === 3 ? undefined : '1px solid'}
          borderColor="border.tertiary"
        >
          <PMBox
            width="28px"
            height="28px"
            borderRadius="sm"
            bg="background.tertiary"
          />
          <PMBox flex={1.6} minW={0}>
            <PMBox
              width="40%"
              height="10px"
              borderRadius="sm"
              bg="background.tertiary"
              marginBottom={2}
            />
            <PMBox
              width="60%"
              height="8px"
              borderRadius="sm"
              bg="background.secondary"
            />
          </PMBox>
          <PMBox
            width="120px"
            height="10px"
            borderRadius="sm"
            bg="background.tertiary"
          />
          <PMBox
            width="80px"
            height="10px"
            borderRadius="sm"
            bg="background.secondary"
          />
          <PMBox
            width="50px"
            height="10px"
            borderRadius="sm"
            bg="background.secondary"
          />
        </PMHStack>
      ))}
    </PMBox>
  );
}
