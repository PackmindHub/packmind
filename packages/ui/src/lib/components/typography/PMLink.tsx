import { Link, LinkProps } from '@chakra-ui/react';

export interface IPMLinkProps extends Omit<LinkProps, 'variant'> {
  variant?: 'plain' | 'navbar' | 'underline' | 'active';
  to?: string;
}

export const PMLink: React.FC<IPMLinkProps> = ({
  variant = 'plain',
  to,
  ...rest
}) => {
  return <Link variant={variant as LinkProps['variant']} {...rest} />;
};
