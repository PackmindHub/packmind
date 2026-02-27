/* based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/segment-group.ts */
export const pmSegmentedControl = {
  slots: [],
  base: {
    root: {
      bg: '{colors.background.secondary}',
    },
    item: {
      cursor: 'pointer',
      '&[data-state=checked]': {
        color: '{colors.beige.1000}',
      },
    },
    indicator: {
      bg: '{colors.branding.primary}',
    },
  },
};
