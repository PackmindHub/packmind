import { PMHStack, PMText, PMVStack } from '@packmind/ui';

export function MetadataKeyValueDisplay({
  metadata,
}: {
  metadata: Record<string, string>;
}) {
  return (
    <PMVStack gap={1} align="flex-start">
      {Object.entries(metadata).map(([key, value]) => (
        <PMHStack key={key} gap={2}>
          <PMText fontSize="sm" fontWeight="bold">
            {key}:
          </PMText>
          <PMText fontSize="sm">{value}</PMText>
        </PMHStack>
      ))}
    </PMVStack>
  );
}
