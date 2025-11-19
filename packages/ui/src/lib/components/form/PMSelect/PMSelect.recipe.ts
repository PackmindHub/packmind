import { defineSlotRecipe } from '@chakra-ui/react';

export const pmSelectRecipe = defineSlotRecipe({
  slots: [],
  base: {
    item: {
      _hover: {
        bg: '{colors.background.tertiary}',
      },
      _selected: {
        bg: '{colors.background.tertiary}',
      },
    },
  },
});
