import { defineRecipe } from '@chakra-ui/react';

const pmHeadingRecipe = defineRecipe({
  variants: {
    size: {
      h1: {
        fontSize: '4xl',
        fontWeight: 'bold',
        lineHeight: 'taller',
        letterSpacing: 'tight',
      },
      h2: {
        fontSize: '3xl',
        fontWeight: 'bold',
        lineHeight: 'taller',
        letterSpacing: 'tight',
      },
      h3: {
        fontSize: '2xl',
        fontWeight: 'medium',
        lineHeight: 'tall',
        letterSpacing: 'normal',
      },
      h4: {
        fontSize: 'xl',
        fontWeight: 'medium',
        lineHeight: 'moderate',
        letterSpacing: 'normal',
      },
      h5: {
        fontSize: 'lg',
        fontWeight: 'medium',
        lineHeight: 'short',
        letterSpacing: 'normal',
      },
      h6: {
        fontSize: 'sm',
        fontWeight: 'medium',
        lineHeight: 'shorter',
        letterSpacing: 'wide',
      },
    },
  },
});

export default pmHeadingRecipe;
