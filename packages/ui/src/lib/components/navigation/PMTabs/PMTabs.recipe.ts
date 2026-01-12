import { defineSlotRecipe } from '@chakra-ui/react';

// based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/tabs.ts

export const pmTabsRecipe = defineSlotRecipe({
  slots: ['content', 'list', 'trigger'],
  variants: {
    variant: {
      line: {
        list: {
          borderColor: '{colors.border.secondary}',
        },
        trigger: {
          color: '{colors.text.tertiary}',
          _selected: {
            color: '{colors.text.primary}',
            _horizontal: {
              '--indicator-color': '{colors.branding.primary}',
            },
          },
        },
      },
      enclosed: {
        list: {
          bg: '{colors.background.tertiary}',
          rounded: 'md',
          mb: 2,
        },
        trigger: {
          color: '{colors.text.tertiary}',
          _selected: {
            color: '{colors.text.primary}',
            bg: '{colors.background.primary}',
            rounded: 'md',
          },
        },
      },
    },
  },
});
