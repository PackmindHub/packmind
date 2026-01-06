---
name: Front-end UI and Design Systems
globs: apps/frontend/**/*.tsx
alwaysApply: false
description: Adopt guidelines for using Chakra UI v3 through the @packmind/ui design system in React applications to ensure consistent UI implementation and visual consistency, applying this standard when building or modifying any frontend components.
---

## Standard: Front-end UI and Design Systems

Adopt guidelines for using Chakra UI v3 through the @packmind/ui design system in React applications to ensure consistent UI implementation and visual consistency, applying this standard when building or modifying any frontend components. :

- Never use vanilla HTML tags (div, span, button, input, etc.) in frontend component code; always use corresponding @packmind/ui components (PMBox, PMText, PMButton, PMInput, etc.) to ensure consistent styling and theming.
- Prefer using the design token 'full' instead of the literal value '100%' for width or height properties in UI components to maintain consistency with the design system.
- Use components imported from '@packmind/ui' instead of '@chakra-ui' packages to maintain a consistent UI abstraction layer, e.g., import { PMButton } from '@packmind/ui'; not import { Button } from '@chakra-ui/react';
- Use only semantic tokens to customize @packmind/ui components, such as colorPalette for color schemes, background.primary/secondary/tertiary for backgrounds, text.primary/secondary/tertiary for text colors, and border.primary/secondary/tertiary for borders, rather than hardcoded color values.

Full standard is available here for further request: [Front-end UI and Design Systems](../../../.packmind/standards/front-end-ui-and-design-systems.md)
