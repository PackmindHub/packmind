import {
  Button,
  ButtonProps,
  ButtonGroup,
  ButtonGroupProps,
} from '@chakra-ui/react';

interface IPMButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost';
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
