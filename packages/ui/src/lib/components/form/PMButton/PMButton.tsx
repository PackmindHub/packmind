import {
  Button,
  ButtonProps,
  ButtonGroup,
  ButtonGroupProps,
} from '@chakra-ui/react';

export interface IPMButtonProps extends ButtonProps {
  variant?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'outline'
    | 'ghost'
    | 'success'
    | 'warning'
    | 'danger';
  children: React.ReactNode;
}

export const PMButton = (props: IPMButtonProps) => {
  const { children, variant = 'primary', ...buttonProps } = props;

  return (
    <Button {...buttonProps} variant={variant}>
      {children}
    </Button>
  );
};

export const PMButtonGroup = ButtonGroup;
export type PMButtonGroupProps = ButtonGroupProps;
