import { defineSlotRecipe } from '@chakra-ui/react';

// based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/table.ts

export const pmTableRecipe = defineSlotRecipe({
  slots: ['root', 'columnHeader', 'row', 'cell'],
  base: {
    root: {
      marginTop: '2',
      marginBottom: '2',
    },
    columnHeader: {
      backgroundColor: '{colors.background.primary}',
      color: '{colors.text.primary}',
    },
    row: {
      bg: '{colors.background.secondary}',
    },
    cell: {
      bg: '{colors.background.secondary}',
    },
  },
  variants: {
    striped: {
      true: {
        row: {
          '&:nth-of-type(odd) td': {
            bg: '{colors.background.tertiary}',
          },
        },
      },
    },

    variant: {
      line: {
        columnHeader: {
          borderBottomColor: '{colors.border.primary}',
        },
        cell: {
          borderBottomColor: '{colors.border.primary}',
        },
      },
    },
  },
});
