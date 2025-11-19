import { Timeline } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTimelineConnectorProps = {
  children?: ReactNode;
};

export const PMTimelineConnector = ({ children }: PMTimelineConnectorProps) => {
  return createElement(Timeline.Connector as SlotComponent, {}, children);
};
