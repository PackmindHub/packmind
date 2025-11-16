import { defineSlotRecipe } from '@chakra-ui/react';

/* based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/radio-group.ts */
export const pmRadioGroup = defineSlotRecipe({
  slots: ['root', 'item', 'itemControl', 'itemIndicator', 'itemText'],
  base: {
    root: {
      gap: '2',
    },
    item: {
      gap: '2.5',
    },
    itemControl: {
      borderColor: '{colors.border.primary}',
      borderWidth: '2px',
      bg: 'transparent',
      width: '5',
      height: '5',
      _before: {
        display: 'none',
      },
      '& .dot': {
        display: 'none',
      },
      _checked: {
        bg: '{colors.blue.200}',
        borderColor: '{colors.blue.200}',
      },
      '&[data-checked]': {
        bg: '{colors.blue.200}',
        borderColor: '{colors.blue.200}',
      },
      _hover: {
        borderColor: '{colors.blue.200}',
      },
      _focusVisible: {
        outlineColor: '{colors.blue.200}',
      },
    },
    itemIndicator: {
      _before: {
        display: 'none',
      },
    },
    itemText: {
      color: '{colors.text.primary}',
    },
  },
});
