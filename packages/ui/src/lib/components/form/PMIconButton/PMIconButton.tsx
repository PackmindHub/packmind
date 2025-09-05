import { IconButton, IconButtonProps } from '@chakra-ui/react';

export interface IPMIconButtonProps extends IconButtonProps {
  variant?: 'solid' | 'subtle' | 'surface' | 'outline' | 'ghost' | 'plain';
  children: React.ReactNode;
}

export const PMIconButton = (props: IPMIconButtonProps) => {
  const { children, variant = 'ghost', ...iconButtonProps } = props;

  return (
    <IconButton {...iconButtonProps} variant={variant}>
      {children}
    </IconButton>
  );
};
