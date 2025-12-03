---
applyTo: '**'
---
## Standard: Chakra UI v3 Component Composition and Styling

Establish consistent Chakra UI v3 usage patterns for component composition, styling, theming, and layout structure in Next.js React applications :
* Compose UI components using Chakra primitives (`Box`, `Text`, `Flex`, `Stack`) with style props (`bg`, `p`, `borderRadius`, `_hover`) instead of inline style objects or CSS classes
* Define color palettes in centralized theme constant files (e.g., `theme/colors.ts`) using semantic naming (`text.primary`, `bg.white`, `border.default`) based on purpose rather than specific color values
* Structure pages using `PageLayout` wrapper with standardized padding (`padding={12}`) and max-width (`maxWidth="breakpoint-xl"`), paired with `PageHeader` component for title, description, and toolbar props
* Use Chakra compound components (`Drawer`, `Tooltip`, `Modal`) with proper namespace destructuring (`ChakraTooltip.Root`, `ChakraTooltip.Trigger`) and context-aware rendering via `Drawer.Context` for dynamic state access
* Wrap Next.js `Link` with Chakra `Link` using `asChild` prop (`<ChakraLink asChild>`) to enable client-side navigation while maintaining Chakra styling capabilities and hover states

Full standard is available here for further request: [Chakra UI v3 Component Composition and Styling](../../.packmind/standards/chakra-ui-v3-component-composition-and-styling.md)