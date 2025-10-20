/* based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/segment-group.ts */
export const pmSegmentedControl = {
  slots: [],
  base: {
    root: {
      bg: '{colors.background.secondary}',
    },
    item: {
      cursor: 'pointer',
      border: '1px solid',
      borderColor: '{colors.border.primary}',
      '&[data-state=checked]': {
        bg: '{colors.branding.primary}',
        color: '{colors.beige.1000}',
      },
    },
  },
};
