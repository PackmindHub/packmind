import { defineSlotRecipe } from '@chakra-ui/react';

export const pmTreeViewRecipe = defineSlotRecipe({
  slots: [
    'root',
    'tree',
    'item',
    'itemText',
    'itemIndicator',
    'branch',
    'branchControl',
    'branchTrigger',
    'branchContent',
    'branchText',
    'branchIndicator',
    'branchIndentGuide',
  ],
  base: {
    item: {
      _hover: {
        color: 'text.secondary',
        bg: 'blue.800',
      },
    },
    branchControl: {
      _hover: {
        color: 'text.secondary',
        bg: 'blue.800',
      },
    },
    branchIndentGuide: {
      bg: '{colors.border.tertiary}',
    },
  },
  variants: {
    variant: {
      subtle: {
        item: {
          _selected: {
            color: 'text.primary',
            bg: 'blue.900',
          },
        },
        branchControl: {
          _selected: {
            bg: 'transparent',
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'subtle',
  },
});
