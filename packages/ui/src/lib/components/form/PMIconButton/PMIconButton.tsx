import { IconButton, IconButtonProps } from '@chakra-ui/react';

export interface IPMIconButtonProps extends Omit<IconButtonProps, 'variant'> {
  variant?:
    | 'solid'
    | 'subtle'
    | 'surface'
    | 'outline'
    | 'ghost'
    | 'plain'
    | 'tertiary';
  children: React.ReactNode;
}

export const PMIconButton = (props: IPMIconButtonProps) => {
  const { children, variant = 'ghost', ...iconButtonProps } = props;

  return (
    <IconButton {...iconButtonProps} variant={variant as IconButtonProps['variant']}>
      {children}
    </IconButton>
  );
};
