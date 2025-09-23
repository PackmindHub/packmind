import { Link, LinkProps } from '@chakra-ui/react';

export interface IPMLinkProps extends LinkProps {
  variant?: 'plain' | 'navbar' | 'underline' | 'active';
  to?: string;
}

export const PMLink: React.FC<IPMLinkProps> = ({
  variant = 'plain',
  to,
  ...rest
}) => {
  return <Link variant={variant} {...rest} />;
};
