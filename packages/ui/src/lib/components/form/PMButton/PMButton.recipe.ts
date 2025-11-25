import { defineRecipe } from '@chakra-ui/react';

export const pmButtonRecipe = defineRecipe({
  variants: {
    variant: {
      primary: {
        bg: '{colors.blue.200}',
        color: '{colors.beige.1000}',
        _hover: {
          bg: '{colors.blue.300}',
        },
        _disabled: {
          bg: '{colors.blue.600}',
          color: '{colors.beige.800}',
        },
      },
      secondary: {
        bg: '{colors.beige.1000}',
        borderColor: '{colors.beige.900}',
        _hover: {
          bg: '{colors.beige.900}',
        },
        _disabled: {
          bg: '{colors.beige.900}',
          color: '{colors.beige.500}',
          borderColor: '{colors.beige.1000}',
        },
      },
      tertiary: {
        bg: '{colors.beige.800}',
        color: '{colors.beige.200}',
        _hover: {
          bg: '{colors.beige.700}',
        },
        _disabled: {
          bg: '{colors.beige.900}',
          color: '{colors.beige.500}',
        },
      },
      outline: {
        borderColor: '{colors.blue.200}',
        color: '{colors.blue.200}',
        _hover: {
          color: '{colors.blue.300}',
          borderColor: '{colors.blue.300}',
          bg: 'transparent',
        },
        _disabled: {
          borderColor: '{colors.blue.600}',
          color: '{colors.blue.600}',
          bg: 'transparent',
        },
      },
      danger: {
        bg: '{colors.red.500}',
        borderColor: '{colors.red.500}',
        _hover: {
          bg: '{colors.red.900}',
        },
        _disabled: {
          bg: '{colors.red.900}',
          color: '{colors.red.500}',
          borderColor: '{colors.red.1000}',
        },
      },
      success: {
        bg: '{colors.green.500}',
        borderColor: '{colors.green.500}',
        _hover: {
          bg: '{colors.green.900}',
        },
        _disabled: {
          bg: '{colors.green.900}',
          color: '{colors.green.500}',
          borderColor: '{colors.green.1000}',
        },
      },
      warning: {
        bg: '{colors.yellow.500}',
        borderColor: '{colors.yellow.500}',
        _hover: {
          bg: '{colors.yellow.900}',
        },
        _disabled: {
          bg: '{colors.yellow.900}',
          color: '{colors.yellow.500}',
          borderColor: '{colors.yellow.1000}',
        },
      },
      ghost: {
        borderColor: 'transparent',
        padding: 0,
        _hover: {
          bg: 'transparent',
        },
        _disabled: {
          bg: 'transparent',
        },
        _focus: {
          bg: 'transparent',
        },
        _expanded: {
          bg: 'transparent',
        },
      },
    },
  },
});
