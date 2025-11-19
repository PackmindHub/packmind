import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineSeparatorProps = {
  children?: ReactNode;
};

export const PMTimelineSeparator = ({ children }: PMTimelineSeparatorProps) => {
  return createElement(Timeline.Separator as SlotComponent, {}, children);
};
