import { defineSlotRecipe } from '@chakra-ui/react';

// based on https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/theme/recipes/timeline.ts

export const pmTimelineRecipe = defineSlotRecipe({
  slots: [
    'root',
    'item',
    'content',
    'separator',
    'indicator',
    'connector',
    'title',
    'description',
    'timestamp',
  ],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: 'full',
      height: 'full',
    },
    item: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '4',
      pb: '8',
      position: 'static',
      _last: {
        pb: '0',
      },
    },
    separator: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flexShrink: 0,
      mt: '0.5',
      position: 'static',
    },
    indicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '4',
      height: '4',
      borderRadius: 'full',
      borderWidth: '2px',
      zIndex: 'auto',
      flexShrink: 0,
      position: 'static',
    },
    connector: {
      width: '2px',
      bg: '{colors.border.secondary}',
      flex: 1,
      mt: '2',
      position: 'static',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5',
      minW: 0,
      flex: 1,
      position: 'static',
    },
    title: {
      textStyle: 'sm',
      fontWeight: 'semibold',
      color: '{colors.text.primary}',
      lineHeight: 'short',
    },
    description: {
      textStyle: 'sm',
      color: '{colors.text.secondary}',
      lineHeight: 'normal',
    },
    timestamp: {
      textStyle: 'xs',
      color: '{colors.text.tertiary}',
      fontWeight: 'normal',
    },
  },
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
          bg: '{colors.background.tertiary}',
          borderColor: '{colors.border.tertiary}',
        },
        connector: {
          bg: '{colors.border.tertiary}',
        },
      },
    },
    size: {
      sm: {
        title: { textStyle: 'xs' },
        description: { textStyle: 'xs' },
        timestamp: { textStyle: '2xs' },
        indicator: { width: '3', height: '3', fontSize: 'xs' },
        content: { gap: '1' },
        separator: { mt: '0' },
        item: { gap: '3', pb: '6' },
      },
      md: {
        title: { textStyle: 'sm' },
        description: { textStyle: 'sm' },
        timestamp: { textStyle: 'xs' },
        indicator: { width: '4', height: '4', fontSize: 'sm' },
        content: { gap: '1.5' },
        separator: { mt: '0.5' },
        item: { gap: '4', pb: '8' },
      },
      lg: {
        title: { textStyle: 'md' },
        description: { textStyle: 'md' },
        timestamp: { textStyle: 'sm' },
        indicator: { width: '5', height: '5', fontSize: 'md' },
        content: { gap: '2' },
        separator: { mt: '1' },
        item: { gap: '5', pb: '10' },
      },
    },
    colorPalette: {
      primary: {
        indicator: {
          _solid: {
            bg: '{colors.branding.primary}',
            borderColor: '{colors.branding.primary}',
          },
          _outline: {
            borderColor: '{colors.branding.primary}',
          },
        },
      },
      success: {
        indicator: {
          _solid: {
            bg: '{colors.feedback.success}',
            borderColor: '{colors.feedback.success}',
          },
          _outline: {
            borderColor: '{colors.feedback.success}',
          },
        },
      },
      warning: {
        indicator: {
          _solid: {
            bg: '{colors.feedback.warning}',
            borderColor: '{colors.feedback.warning}',
          },
          _outline: {
            borderColor: '{colors.feedback.warning}',
          },
        },
      },
      error: {
        indicator: {
          _solid: {
            bg: '{colors.feedback.error}',
            borderColor: '{colors.feedback.error}',
          },
          _outline: {
            borderColor: '{colors.feedback.error}',
          },
        },
      },
      info: {
        indicator: {
          _solid: {
            bg: '{colors.feedback.info}',
            borderColor: '{colors.feedback.info}',
          },
          _outline: {
            borderColor: '{colors.feedback.info}',
          },
        },
      },
      neutral: {
        indicator: {
          _solid: {
            bg: '{colors.text.secondary}',
            borderColor: '{colors.text.secondary}',
          },
          _outline: {
            borderColor: '{colors.text.secondary}',
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'md',
  },
});
