import {
  Badge as ChakraBadge,
  BadgeProps as ChakraBadgeProps,
} from '@chakra-ui/react';

export type BadgeProps = ChakraBadgeProps;

export const PMBadge = (props: BadgeProps) => {
  return <ChakraBadge {...props} />;
};
