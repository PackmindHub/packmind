export const pmComboboxRecipe = {
  slots: [],
  base: {
    input: {
      backgroundColor: '{colors.background.tertiary}',
    },
    content: {
      borderColor: '{colors.border.tertiary}',
      borderWidth: '1px',
    },
    indicatorGroup: {
      color: '{colors.text.faded}',
    },
    clearTrigger: {
      color: '{colors.text.secondary}',
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
};
