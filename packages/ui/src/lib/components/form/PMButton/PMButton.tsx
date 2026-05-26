import {
  Button,
  ButtonProps,
  ButtonGroup,
  ButtonGroupProps,
} from '@chakra-ui/react';

export type PMButtonVariants =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'warning'
  | 'danger';

export interface IPMButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: PMButtonVariants;
  children: React.ReactNode;
}

export const PMButton = (props: IPMButtonProps) => {
  const { children, variant = 'primary', ...buttonProps } = props;

  return (
    <Button {...buttonProps} variant={variant as ButtonProps['variant']}>
      {children}
    </Button>
  );
};

export const PMButtonGroup = ButtonGroup;
export type PMButtonGroupProps = ButtonGroupProps;
