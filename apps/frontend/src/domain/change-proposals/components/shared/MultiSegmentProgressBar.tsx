import { PMBox } from '@packmind/ui';

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
    <PMBox
      display="flex"
      height="2px"
      borderRadius="full"
      overflow="hidden"
      width="full"
      bg="bg.subtle"
    >
      {segments.map(
        (segment, i) =>
          segment.count > 0 && (
            <PMBox
              key={i}
              width={`${(segment.count / total) * 100}%`}
              height="100%"
              bg={segment.color}
            />
          ),
      )}
    </PMBox>
  );
}
