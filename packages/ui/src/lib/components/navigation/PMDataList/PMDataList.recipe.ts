import { defineSlotRecipe } from '@chakra-ui/react';
export const pmDataListRecipe = defineSlotRecipe({
  slots: ['itemLabel', 'itemValue'],
  variants: {
    variant: {
      subtle: {
        itemLabel: {
          color: 'text.faded',
        },
      },
      bold: {
        itemLabel: {
          fontWeight: 'medium',
        },
        itemValue: {
          color: 'text.faded',
        },
      },
    },
  },
});
