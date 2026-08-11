import { defineSlotRecipe } from '@chakra-ui/react';
import { radioGroupAnatomy } from '@chakra-ui/react/anatomy';

/* based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/radio-group.ts */
export const pmRadioGroup = defineSlotRecipe({
  slots: radioGroupAnatomy.keys(),
  base: {
    itemControl: {
      _checked: {},
      '&[data-checked]': {
        borderColor: '{colors.blue.200}',
      },
      _hover: {
        borderColor: '{colors.blue.200}',
      },
      _focusVisible: {
        outlineColor: '{colors.blue.200}',
      },
    },
    itemText: {
      fontSize: 'sm',
      color: '{colors.text.secondary}',
    },
  },
});
