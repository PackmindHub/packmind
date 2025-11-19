import { Timeline, TimelineRootProps } from '@chakra-ui/react';
import { PMTimelineItem } from './PMTimelineItem';
import { PMTimelineContent } from './PMTimelineContent';
import { PMTimelineSeparator } from './PMTimelineSeparator';
import { PMTimelineIndicator } from './PMTimelineIndicator';
import { PMTimelineConnector } from './PMTimelineConnector';
import { PMTimelineTitle } from './PMTimelineTitle';
import { PMTimelineDescription } from './PMTimelineDescription';
import { PMTimelineTimestamp } from './PMTimelineTimestamp';

export interface PMTimelineProps extends TimelineRootProps {
  children: React.ReactNode;
}

export const PMTimeline = ({ children, ...rest }: PMTimelineProps) => {
  return <Timeline.Root {...rest}>{children}</Timeline.Root>;
};

// Export slot components for composition
export {
  PMTimelineItem,
  PMTimelineContent,
  PMTimelineSeparator,
  PMTimelineIndicator,
  PMTimelineConnector,
  PMTimelineTitle,
  PMTimelineDescription,
  PMTimelineTimestamp,
};
