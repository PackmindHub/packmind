# Front-end UI and Design Systems

This standard establishes guidelines for using Chakra UI v3 through the @packmind/ui design system to ensure consistent UI implementation across the frontend application. The @packmind/ui package provides a mapping of Chakra UI components with the same names and props, enhanced with Packmind-specific theming and semantic tokens. Apply this standard when building or modifying any React components in the frontend application to maintain visual consistency and leverage the centralized design system.

## Rules

* Never use vanilla HTML tags (div, span, button, input, etc.) in frontend component code; always use corresponding @packmind/ui components (PMBox, PMText, PMButton, PMInput, etc.) to ensure consistent styling and theming.
* Prefer using the design token 'full' instead of the literal value '100%' for width or height properties in UI components to maintain consistency with the design system.
* Use components imported from '@packmind/ui' instead of '@chakra-ui' packages to maintain a consistent UI abstraction layer, e.g., import { PMButton } from '@packmind/ui'; not import { Button } from '@chakra-ui/react';
* Use only semantic tokens to customize @packmind/ui components, such as colorPalette for color schemes, background.primary/secondary/tertiary for backgrounds, text.primary/secondary/tertiary for text colors, and border.primary/secondary/tertiary for borders, rather than hardcoded color values.
