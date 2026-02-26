import { PMBox, PMHStack } from '@packmind/ui';

interface Segment {
  count: number;
  color: string;
}

interface MultiSegmentProgressBarProps {
  segments: Segment[];
}

export function MultiSegmentProgressBar({
  segments,
}: Readonly<MultiSegmentProgressBarProps>) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  return (
    <PMHStack
      gap={0}
      height="6px"
      borderRadius="full"
      overflow="hidden"
      width="full"
    >
      {segments.map(
        (segment, i) =>
          segment.count > 0 && (
            <PMBox key={i} flex={segment.count} bg={segment.color} />
          ),
      )}
    </PMHStack>
  );
}
