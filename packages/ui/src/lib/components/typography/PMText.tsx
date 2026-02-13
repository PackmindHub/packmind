import { Text, TextProps } from '@chakra-ui/react';

export type PMTextColors =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'faded'
  | 'warning'
  | 'success'
  | 'primaryLight'
  | 'secondaryLight'
  | 'tertiaryLight';

export interface PMTextProps extends TextProps {
  as?: 'span' | 'p' | 'div';
  variant?: 'body' | 'body-important' | 'small' | 'small-important';
  color?: PMTextColors;
  children: React.ReactNode;
  textProps?: TextProps;
}

export function PMText({
  as = 'span',
  variant = 'body',
  color = 'primary',
  children,
  textProps,
  ...rest
}: PMTextProps) {
  return (
    <Text
      as={as}
      textStyle={variant}
      {...rest}
      color={`{colors.text.${color}}`}
      _selection={{ backgroundColor: 'blue.500' }}
      {...textProps}
    >
      {children}
    </Text>
  );
}
