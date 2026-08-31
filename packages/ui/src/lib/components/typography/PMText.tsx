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
  /**
   * Data attributes, which already reached the rendered element through the
   * spread below and were only ever refused by this type. A piece of text that
   * cannot carry a test id is a piece of text an end-to-end suite has to find
   * by counting its neighbours, which is how it comes to depend on a layout
   * nobody promised it.
   */
  [dataAttribute: `data-${string}`]: unknown;
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
