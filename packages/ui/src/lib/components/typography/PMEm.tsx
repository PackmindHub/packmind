import { Em, EmProps } from '@chakra-ui/react';

export interface PMEmProps extends EmProps {
  children: React.ReactNode;
}

export function PMEm({ children, ...rest }: PMEmProps) {
  return <Em {...rest}>{children}</Em>;
}
