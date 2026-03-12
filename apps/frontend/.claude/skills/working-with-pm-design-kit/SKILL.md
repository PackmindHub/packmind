---
name: 'working-with-pm-design-kit'
description: 'This skill provides guidance for using the Packmind UI component library (@packmind/ui). It should be used when building or modifying frontend UI with PM-prefixed components, working with Chakra UI in the Packmind codebase, or when questions arise about available components, theming, or layout patterns. Triggers on mentions of PM components, @packmind/ui, Chakra UI usage, design kit, or frontend component implementation.'
---

# Working With the PM Design Kit

## Overview

The Packmind design kit (`@packmind/ui`) is a component library built on top of Chakra UI v3. All components are prefixed with `PM` and provide a consistent, themed API across the application. The source lives in `packages/ui/`.

**Import pattern**: Always import from `@packmind/ui`, never from Chakra UI directly.

```tsx
import { PMButton, PMBox, PMHeading, PMText } from '@packmind/ui';
```

## Component Selection Guide

Before reaching for a raw `<div>` or Chakra primitive, check if a PM component exists. Consult `references/component-catalog.md` for the full inventory organized by category.

### Decision Flow

1. **Need a layout container?** Use `PMBox`, `PMVStack`, `PMHStack`, `PMFlex`, or `PMGrid`.
2. **Need text?** Use `PMHeading` (with `level` prop for semantic h1–h6) or `PMText` (with `variant` and `color`).
3. **Need a button?** Use `PMButton` with the appropriate `variant`: `primary` for main actions, `secondary`/`ghost` for secondary, `danger` for destructive.
4. **Need user input?** Use `PMInput`, `PMTextArea`, `PMSelect`, `PMCheckbox`, `PMSwitch`, or `PMRadioGroup`.
5. **Need feedback?** Use `pmToaster` for transient messages, `PMAlert` for inline messages, `PMConfirmationModal` for destructive confirmations.
6. **Need an overlay?** Use `PMDialog` for modals, `PMPopover` for contextual info, `PMDrawer` for side panels.
7. **Need to show nothing?** Use `PMEmptyState` with title, description, icon, and an action button.
8. **Need loading placeholders?** Use `PMSkeleton` for content areas, `PMSpinner` for inline indicators.
9. **No PM wrapper exists?** Check Chakra UI v3 docs, then ask the user before using a raw Chakra component.

## Compound Component Patterns

Several PM components use Chakra's compound pattern with dot notation. Always use the compound API — do not try to reconstruct these with standalone elements.

```tsx
// Dialog
<PMDialog.Root open={isOpen} onOpenChange={setIsOpen}>
  <PMDialog.Backdrop />
  <PMDialog.Positioner>
    <PMDialog.Content>
      <PMDialog.Header>
        <PMDialog.Title>Title</PMDialog.Title>
        <PMDialog.CloseTrigger />
      </PMDialog.Header>
      {/* body */}
    </PMDialog.Content>
  </PMDialog.Positioner>
</PMDialog.Root>

// Accordion
<PMAccordion.Root>
  <PMAccordion.Item value="section-1">
    <PMAccordion.ItemTrigger>Section 1</PMAccordion.ItemTrigger>
    <PMAccordion.ItemContent>Content here</PMAccordion.ItemContent>
  </PMAccordion.Item>
</PMAccordion.Root>

// Timeline
<PMTimeline.Root>
  <PMTimeline.Item>
    <PMTimeline.Separator>
      <PMTimeline.Indicator />
      <PMTimeline.Connector />
    </PMTimeline.Separator>
    <PMTimeline.Content>
      <PMTimeline.Title>Event</PMTimeline.Title>
      <PMTimeline.Description>Details</PMTimeline.Description>
    </PMTimeline.Content>
  </PMTimeline.Item>
</PMTimeline.Root>
```

**Key compound components**: `PMDialog`, `PMAccordion`, `PMTimeline`, `PMCarousel`, `PMCopiable`, `PMSelect`, `PMMenu`, `PMTreeView`, `PMTabs`.

Always wrap overlays (dialogs, popovers, drawers) inside `PMPortal` to escape stacking context issues.

## Layout Patterns

### Spacing

Use `gap` on stacks/grids for consistent spacing between children — never use margin on individual children to create gaps.

```tsx
<PMVStack gap="4">
  <PMHeading level="h2">Title</PMHeading>
  <PMText>Description</PMText>
</PMVStack>
```

### Full-Height Layouts

For layouts that fill the viewport, use `height="100vh"` on the root, `flex="1"` on the expanding section, and `minHeight={0}` on flex children that need to scroll.

### Grid Layouts

Use `PMGrid` with `gridTemplateColumns` for multi-panel layouts:

```tsx
<PMGrid gridTemplateColumns="minmax(240px, 270px) 1fr minmax(280px, 320px)">
  <PMBox>Sidebar</PMBox>
  <PMBox>Main</PMBox>
  <PMBox>Detail</PMBox>
</PMGrid>
```

### Page Structure

Use `PMPage` for full-page layouts with title, breadcrumbs, actions, and optional sidebar. Use `PMPageSection` for collapsible content sections within a page.

## Typography

### Headings

Use `PMHeading` with the `level` prop for semantic HTML (h1–h6) and `color` for emphasis:

```tsx
<PMHeading level="h1" color="primary">Page Title</PMHeading>
<PMHeading level="h3" color="secondary">Section Title</PMHeading>
```

Available colors: `primary`, `secondary`, `tertiary`, `faded`, `primaryLight`, `secondaryLight`, `tertiaryLight`.

### Body Text

Use `PMText` with `variant` for size and `color` for emphasis:

```tsx
<PMText variant="body" color="primary">Main content</PMText>
<PMText variant="small" color="secondary">Supporting text</PMText>
```

Variants: `body`, `body-important`, `small`, `small-important`.
Colors: `primary`, `secondary`, `tertiary`, `error`, `faded`, `warning`, `success`, `primaryLight`, `secondaryLight`, `tertiaryLight`.

## Theming

Use semantic tokens — never hardcode hex colors or raw Chakra palette values.

### Semantic Token Categories

| Category | Tokens | Usage |
|----------|--------|-------|
| Background | `background.primary`, `.secondary`, `.tertiary`, `.faded` | Surface colors (dark to light) |
| Text | `text.primary`, `.secondary`, `.tertiary`, `.faded`, `.error`, `.warning`, `.success` | Text contrast levels |
| Border | `border.primary`, `.secondary`, `.tertiary` | Border contrast levels |

### Status Colors

Use the semantic color names for status indicators:
- **Success**: `green` palette or `text.success`
- **Error/Danger**: `red` palette or `text.error`
- **Warning**: `orange` palette or `text.warning`
- **Info/Primary**: `blue` palette

```tsx
<PMButton variant="danger">Delete</PMButton>
<PMText color="error">Validation failed</PMText>
<PMBadge colorPalette="green">Active</PMBadge>
```

## Form Patterns

### Input Fields

`PMInput` provides label, error state, and helper text out of the box:

```tsx
<PMInput
  label="Project name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  helperText="Must be unique within the organization"
  maxLength={255}
/>
```

### Form Layout

Group related fields with `PMFormContainer`:

```tsx
<PMFormContainer maxWidth="400px" centered>
  <PMInput label="Name" />
  <PMInput label="Email" />
  <PMButton variant="primary" type="submit">Save</PMButton>
</PMFormContainer>
```

### Validation

Show errors directly on inputs via the `error` prop — this adds a red border and displays the message below the field. Disable submit buttons during async operations with `isLoading`.

## Feedback Patterns

### Toasts (Transient Notifications)

```tsx
import { pmToaster } from '@packmind/ui';

pmToaster.create({
  type: 'success',        // 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: 'Saved',
  description: 'Your changes have been saved.',
  closable: true,
  action: { label: 'Undo', onClick: handleUndo },  // optional
});
```

### Confirmation Modals (Destructive Actions)

```tsx
<PMConfirmationModal
  trigger={<PMButton variant="danger">Delete</PMButton>}
  title="Delete project?"
  message="This action cannot be undone."
  confirmText="Delete"
  confirmColorScheme="red"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

### Inline Alerts

```tsx
<PMAlert.Root status="warning">
  <PMAlert.Indicator />
  <PMAlert.Title>Attention</PMAlert.Title>
  <PMAlert.Description>This feature is in beta.</PMAlert.Description>
</PMAlert.Root>
```

### Empty States

```tsx
<PMEmptyState
  title="No standards yet"
  description="Create your first coding standard to get started."
  icon={<LuInbox />}
>
  <PMButton variant="primary">Create Standard</PMButton>
</PMEmptyState>
```

## Icons

Icons come from `react-icons/lu` (Lucide icon set). Import with the `Lu` prefix:

```tsx
import { LuTrash2, LuPlus, LuChevronDown } from 'react-icons/lu';

<PMButton><LuPlus /> Add Item</PMButton>
<PMIconButton variant="ghost"><LuTrash2 /></PMIconButton>
```

Control size via `fontSize` or `size` props on the icon element.

## Responsive Design

Use Chakra's responsive object syntax with breakpoints `base`, `sm`, `md`, `lg`, `xl`:

```tsx
<PMBox
  display={{ base: 'none', md: 'flex' }}
  width={{ base: '100%', lg: '60%' }}
  padding={{ base: '4', md: '6' }}
/>
```

Mobile-first approach: `base` styles apply to all sizes, then override at larger breakpoints.

## Button Variant Guide

| Variant | Usage |
|---------|-------|
| `primary` | Main action on the page (one per view) |
| `secondary` | Important but not primary actions |
| `tertiary` | Low-emphasis actions |
| `outline` | Alternative to secondary with border emphasis |
| `ghost` | Minimal actions (toolbar buttons, inline actions) |
| `success` | Positive confirmations |
| `warning` | Caution-required actions |
| `danger` | Destructive actions (delete, remove) |

## Anti-Patterns

- **Do not** import from `@chakra-ui/react` directly — always use `@packmind/ui` wrappers.
- **Do not** use inline styles or hardcoded colors — use semantic tokens and component props.
- **Do not** create custom modal/overlay implementations — use `PMDialog`, `PMDrawer`, or `PMPopover` with `PMPortal`.
- **Do not** build custom loading indicators — use `PMSkeleton` or `PMSpinner`.
- **Do not** use `as="h1"` on headings — use the `level` prop on `PMHeading` for semantic HTML.

## Resources

### references/

- `component-catalog.md` — Full inventory of all PM components with props, organized by category.
