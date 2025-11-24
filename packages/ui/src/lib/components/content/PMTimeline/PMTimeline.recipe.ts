import { defineSlotRecipe } from '@chakra-ui/react';

// based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/timeline.ts

export const pmTimelineRecipe = defineSlotRecipe({
  slots: [
    'root',
    'item',
    'connector',
    'separator',
    'indicator',
    'content',
    'title',
    'description',
    'timestamp',
  ],
  variants: {
    variant: {
      solid: {
        indicator: {
          bg: '{colors.branding.primary}',
          borderColor: '{colors.branding.primary}',
        },
      },
      outline: {
        indicator: {
          bg: '{colors.background.primary}',
          borderColor: '{colors.branding.primary}',
        },
      },
      subtle: {
        indicator: {
          outlineWidth: '1px',
          bg: '{colors.background.tertiary}',
          borderColor: '{colors.border.tertiary}',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'solid',
  },
});
