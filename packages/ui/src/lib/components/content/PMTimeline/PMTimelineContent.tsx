import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineContentProps = {
  children: ReactNode;
};

export const PMTimelineContent = ({ children }: PMTimelineContentProps) => {
  return createElement(Timeline.Content as SlotComponent, {}, children);
};
