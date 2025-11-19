import { Timeline } from '@chakra-ui/react';
import { ReactNode, ReactElement, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineIndicatorProps = {
  children?: ReactNode;
  icon?: ReactElement;
};

export const PMTimelineIndicator = ({
  children,
  icon,
}: PMTimelineIndicatorProps) => {
  return createElement(
    Timeline.Indicator as SlotComponent,
    {},
    icon || children,
  );
};
