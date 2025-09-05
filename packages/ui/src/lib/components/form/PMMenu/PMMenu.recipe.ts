import { defineSlotRecipe } from '@chakra-ui/react';

// based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/menu.ts

export const pmMenuRecipe = defineSlotRecipe({
  slots: ['content', 'item'],
  base: {
    content: {
      borderColor: '{colors.border.tertiary}',
      borderWidth: '1px',
    },
  },
  variants: {
    variant: {
      subtle: {
        item: {
          _highlighted: {
            bg: '{colors.background.tertiary}',
          },
        },
      },
    },
  },
});
