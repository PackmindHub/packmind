import { PMBox, PMHStack } from '@packmind/ui';

interface Segment {
  count: number;
  color: string;
}

export function MultiSegmentProgressBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) return null;

  return (
    <PMHStack
      gap={0}
      width="full"
      height="6px"
      borderRadius="full"
      overflow="hidden"
    >
      {segments
        .filter((seg) => seg.count > 0)
        .map((seg, i) => (
          <PMBox key={i} bg={seg.color} flex={seg.count} height="full" />
        ))}
    </PMHStack>
  );
}
