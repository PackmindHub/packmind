import { ReactNode } from 'react';

type PMTimelineTimestampProps = {
  children: ReactNode;
};

export const PMTimelineTimestamp = ({ children }: PMTimelineTimestampProps) => {
  return <time>{children}</time>;
};
