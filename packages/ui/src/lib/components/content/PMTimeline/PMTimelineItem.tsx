import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineItemProps = {
  children: ReactNode;
};

export const PMTimelineItem = ({ children }: PMTimelineItemProps) => {
  return createElement(Timeline.Item as SlotComponent, {}, children);
};
