import { Link, LinkProps } from '@chakra-ui/react';

export interface IPMLinkProps extends Omit<LinkProps, 'variant'> {
  variant?: 'plain' | 'navbar' | 'underline' | 'active';
}

/**
 * Styled anchor. For client-side routing, pass `asChild` and provide the
 * router link as the only child so a single `<a>` is rendered — nesting a
 * router link inside a plain `PMLink` produces invalid `<a>` inside `<a>`
 * markup.
 */
export const PMLink: React.FC<IPMLinkProps> = ({
  variant = 'plain',
  ...rest
}) => {
  return <Link variant={variant as LinkProps['variant']} {...rest} />;
};
