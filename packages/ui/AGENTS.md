# UI Package

Reusable UI components built on Chakra UI v3, providing PM-prefixed components for consistent design system implementation.

## Technologies

- **Chakra UI v3**: Component library foundation
- **React**: Component framework
- **Semantic Tokens**: Design system tokens for theming

## Commands

- Build: `nx build ui`
- Test: `nx test ui`
- Lint: `nx lint ui`

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Front-end UI and Design Systems

Adopt guidelines for using Chakra UI v3 through the @packmind/ui design system in React applications to ensure consistent UI implementation and visual consistency, applying this standard when building or modifying any frontend components. :
* Never use vanilla HTML tags (div, span, button, input, etc.) in frontend component code; always use corresponding @packmind/ui components (PMBox, PMText, PMButton, PMInput, etc.) to ensure consistent styling and theming.
* Prefer using the design token 'full' instead of the literal value '100%' for width or height properties in UI components to maintain consistency with the design system.
* Use components imported from '@packmind/ui' instead of '@chakra-ui' packages to maintain a consistent UI abstraction layer, e.g., import { PMButton } from '@packmind/ui'; not import { Button } from '@chakra-ui/react';
* Use only semantic tokens to customize @packmind/ui components, such as colorPalette for color schemes, background.primary/secondary/tertiary for backgrounds, text.primary/secondary/tertiary for text colors, and border.primary/secondary/tertiary for borders, rather than hardcoded color values.

Full standard is available here for further request: [Front-end UI and Design Systems](.packmind/standards/front-end-ui-and-design-systems.md)
<!-- end: Packmind standards -->
