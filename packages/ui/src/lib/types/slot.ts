import type { ReactNode } from 'react';

export type SlotComponent<Props extends object = object> = React.ComponentType<
  Props & { children?: ReactNode }
>;
