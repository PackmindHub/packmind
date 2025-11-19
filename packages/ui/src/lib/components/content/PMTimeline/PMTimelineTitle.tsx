import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineTitleProps = {
  children: ReactNode;
};

export const PMTimelineTitle = ({ children }: PMTimelineTitleProps) => {
  return createElement(Timeline.Title as SlotComponent, {}, children);
};
