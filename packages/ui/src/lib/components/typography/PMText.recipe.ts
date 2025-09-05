import { defineRecipe } from '@chakra-ui/react';

const pmTextRecipe = defineRecipe({
  variants: {
    textStyle: {
      body: {
        fontSize: 'md',
        lineHeight: 'short',
      },
      'body-important': {
        fontSize: 'md',
        fontWeight: 'medium',
        lineHeight: 'short',
      },
      small: {
        fontSize: 'xs',
        lineHeight: 'shorter',
      },
      'small-important': {
        fontSize: 'xs',
        fontWeight: 'medium',
        lineHeight: 'shorter',
      },
    },
  },
});

export default pmTextRecipe;
