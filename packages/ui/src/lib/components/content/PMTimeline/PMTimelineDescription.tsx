import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineDescriptionProps = {
  children: ReactNode;
};

export const PMTimelineDescription = ({
  children,
}: PMTimelineDescriptionProps) => {
  return createElement(Timeline.Description as SlotComponent, {}, children);
};
