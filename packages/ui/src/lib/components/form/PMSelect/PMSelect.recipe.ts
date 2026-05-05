import { defineSlotRecipe } from '@chakra-ui/react';

export const pmSelectRecipe = defineSlotRecipe({
  slots: ['trigger', 'content', 'item'],
  base: {
    trigger: {
      backgroundColor: '{colors.background.tertiary}',
      borderColor: 'transparent',
      _hover: { borderColor: 'transparent' },
    },
    content: {
      borderColor: '{colors.border.tertiary}',
      borderWidth: '1px',
    },
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
