# Chakra UI v3 Component Composition and Styling

This standard defines how to effectively use Chakra UI v3 primitives and patterns in a Next.js application. It covers proper component composition using Box, Text, Flex, and Stack primitives with Chakra's style props, centralized color and theme management through dedicated constant files, compound component patterns for interactive UI elements like Drawer and Tooltip with proper namespace destructuring, consistent page layout structure using reusable wrapper components, and proper integration of Next.js Link with Chakra UI Link components for client-side navigation. These patterns ensure maintainable, consistent, and accessible UI code across the application while leveraging Chakra UI's design system capabilities.

## Rules

* Compose UI components using Chakra primitives (`Box`, `Text`, `Flex`, `Stack`) with style props (`bg`, `p`, `borderRadius`, `_hover`) instead of inline style objects or CSS classes
* Define color palettes in centralized theme constant files (e.g., `theme/colors.ts`) using semantic naming (`text.primary`, `bg.white`, `border.default`) based on purpose rather than specific color values
* Use Chakra compound components (`Drawer`, `Tooltip`, `Modal`) with proper namespace destructuring (`ChakraTooltip.Root`, `ChakraTooltip.Trigger`) and context-aware rendering via `Drawer.Context` for dynamic state access
* Structure pages using `PageLayout` wrapper with standardized padding (`padding={12}`) and max-width (`maxWidth="breakpoint-xl"`), paired with `PageHeader` component for title, description, and toolbar props
* Wrap Next.js `Link` with Chakra `Link` using `asChild` prop (`<ChakraLink asChild>`) to enable client-side navigation while maintaining Chakra styling capabilities and hover states
