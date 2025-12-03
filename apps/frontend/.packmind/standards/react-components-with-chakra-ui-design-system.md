# React Components with Chakra UI Design System

Implement React components by wrapping Chakra UI primitives with custom PM-prefixed components that use theme tokens instead of hard-coded values extend Chakra component props with React forwardRef and enforce consistent patterns through UIProvider to maintain design system integrity accessibility standards and prevent duplication across projects

## Rules

* Wrap Chakra UI primitives like Button Box Text in custom PM-prefixed components that extend their prop interfaces to inherit aria attributes event handlers and style props never create raw HTML elements with inline styles
* Use React forwardRef when wrapping Chakra primitives to support ref forwarding destructure Chakra component namespaces like Root Content Title and compose with other PM components for consistency
* Define all colors spacing typography in theme tokens using defineConfig from Chakra UI reference tokens with curly brace syntax like colors.background.primary never use hex codes pixel values or inline styles
* Wrap application root with ChakraProvider configured with custom theme system value from defineConfig to ensure all components inherit design tokens and ARIA support
* Export custom PM components from a central index file to enforce consistent imports across the application and prevent direct Chakra UI imports in feature code
