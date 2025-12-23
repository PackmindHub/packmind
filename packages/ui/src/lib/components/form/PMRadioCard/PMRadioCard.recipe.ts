/* based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/radio-card.ts */
export const pmRadioCard = {
  slots: [],
  variants: {
    variant: {
      outline: {
        item: {
          borderColor: 'border.tertiary',
          cursor: 'pointer',
          _checked: {
            bg: 'blue.900',
            borderColor: 'branding.primary',
          },
          _hover: {
            borderColor: 'blue.500',
          },
        },
      },
    },
  },
};
