import { defineRecipe } from '@chakra-ui/react';

const pmLinkRecipe = defineRecipe({
  base: {
    fontSize: 'md',
  },
  variants: {
    variant: {
      plain: {
        color: 'text.secondary',
        _hover: {
          textDecoration: 'underline',
          color: 'branding.primary',
        },
      },
      underline: {
        color: 'text.secondary',
        textDecoration: 'underline',
        _hover: {
          color: 'branding.primary',
        },
      },
      navbar: {
        color: 'text.secondary',
        fontSize: 'sm',
        display: 'block',
        width: '100%',
        borderRadius: 'sm',
        paddingY: 1,
        paddingX: 2,
        fontWeight: 'medium',
        _hover: {
          textDecoration: 'none',
          color: 'text.secondary',
          backgroundColor: 'blue.800',
        },
        _active: {
          color: 'text.primary',
          backgroundColor: 'blue.900',
          fontWeight: 'bold',
        },
      },
    },
  },
});

export { pmLinkRecipe };
