import React from 'react';
import { PMBox } from '../../layout/PMBox/PMBox';
import { PMTooltip } from '../PMTooltip';

export type PMSegmentedBarPalette =
  | 'green'
  | 'orange'
  | 'red'
  | 'blue'
  | 'gray'
  | 'yellow'
  | 'purple';

export type PMSegmentedBarSegment = {
  value: number;
  colorPalette: PMSegmentedBarPalette;
  label?: React.ReactNode;
};

export type PMSegmentedBarProps = {
  segments: ReadonlyArray<PMSegmentedBarSegment>;
  height?: number | string;
  width?: number | string;
  rounded?: boolean;
};

const PALETTE_TOKEN: Record<PMSegmentedBarPalette, string> = {
  green: 'green.500',
  orange: 'orange.500',
  red: 'red.500',
  blue: 'blue.500',
  gray: 'gray.500',
  yellow: 'yellow.500',
  purple: 'purple.500',
};

export const PMSegmentedBar: React.FC<PMSegmentedBarProps> = ({
  segments,
  height = '6px',
  width = '120px',
  rounded = true,
}) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  return (
    <PMBox
      width={width}
      height={height}
      borderRadius={rounded ? 'full' : undefined}
      overflow="hidden"
      display="flex"
      bg="background.tertiary"
    >
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((segment, index) => {
            const pct = (segment.value / total) * 100;
            const fill = (
              <PMBox
                key={index}
                height="100%"
                bg={PALETTE_TOKEN[segment.colorPalette]}
                style={{ flexBasis: `${pct}%` }}
              />
            );
            return segment.label ? (
              <PMTooltip key={index} label={segment.label}>
                {fill}
              </PMTooltip>
            ) : (
              fill
            );
          })}
    </PMBox>
  );
};
