---
name: Packmind
description: Curator's Workshop. Calm warm-dark surfaces, periwinkle brand accent, flat tonal depth, Borna as the single voice.
colors:
  beige-0: '#ffffff'
  beige-50: '#f7f5f2'
  beige-100: '#e9e3dd'
  beige-200: '#cfcac5'
  beige-300: '#b6b1ad'
  beige-400: '#9c9894'
  beige-500: '#84807d'
  beige-600: '#6c6967'
  beige-700: '#555352'
  beige-800: '#3f3d3c'
  beige-900: '#2a2a29'
  beige-1000: '#181818'
  blue-100: '#e1e3fd'
  blue-200: '#c3c7fc'
  blue-300: '#a6acfb'
  blue-500: '#777bbf'
  blue-600: '#62659d'
  blue-800: '#393b5c'
  blue-900: '#27283e'
  orange-300: '#fe9680'
  orange-500: '#c46652'
  green-500: '#648b54'
  red-500: '#dd5151'
  yellow-500: '#8e8227'
  purple-500: '#b261c1'
typography:
  display:
    fontFamily: 'Borna, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Borna, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Borna, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 'normal'
  body:
    fontFamily: 'Borna, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 'normal'
  label:
    fontFamily: 'Borna, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.025em'
rounded:
  sm: '0.125rem'
  md: '0.25rem'
  lg: '0.5rem'
spacing:
  xs: '0.25rem'
  sm: '0.5rem'
  md: '0.75rem'
  lg: '1rem'
  xl: '1.5rem'
  '2xl': '2rem'
components:
  button-primary:
    backgroundColor: '{colors.blue-200}'
    textColor: '{colors.beige-1000}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
  button-primary-hover:
    backgroundColor: '{colors.blue-300}'
    textColor: '{colors.beige-1000}'
  button-primary-disabled:
    backgroundColor: '{colors.blue-600}'
    textColor: '{colors.beige-800}'
  button-secondary:
    backgroundColor: '{colors.beige-1000}'
    textColor: '{colors.beige-0}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
  button-secondary-hover:
    backgroundColor: '{colors.beige-900}'
    textColor: '{colors.beige-200}'
  button-tertiary:
    backgroundColor: '{colors.beige-800}'
    textColor: '{colors.beige-200}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
  button-tertiary-hover:
    backgroundColor: '{colors.beige-700}'
    textColor: '{colors.beige-100}'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.blue-200}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
  button-outline-hover:
    textColor: '{colors.blue-300}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.beige-100}'
    padding: '0'
  button-danger:
    backgroundColor: '{colors.red-500}'
    textColor: '{colors.beige-0}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
  input-base:
    backgroundColor: '{colors.beige-1000}'
    textColor: '{colors.beige-0}'
    rounded: '{rounded.md}'
    padding: '0.5rem 0.75rem'
  card-surface:
    backgroundColor: '{colors.beige-1000}'
    textColor: '{colors.beige-0}'
    rounded: '{rounded.md}'
    padding: '1rem'
  table-row:
    backgroundColor: '{colors.beige-900}'
    textColor: '{colors.beige-0}'
  table-row-striped:
    backgroundColor: '{colors.beige-800}'
    textColor: '{colors.beige-0}'
  chip-subtle:
    backgroundColor: '{colors.beige-800}'
    textColor: '{colors.beige-200}'
    rounded: '{rounded.sm}'
    padding: '0.125rem 0.5rem'
---

# Design System: Packmind

## 1. Overview

**Creative North Star: "The Curator's Workshop"**

Packmind's design system is a calm, warm-dark surface that reads like a curator's workshop after hours: aged-paper neutrals tinted with warmth, a single periwinkle accent that behaves like ink under lamplight, and almost no chrome between the reader and the content. The product's job is to make a team's engineering playbook coherent across many AI agents; the interface stays out of the way of that work. Density is earned in the governance surfaces (lists, version history, deployment status) and relaxed in the editing surfaces (writing a standard, reviewing a change).

This system explicitly rejects the enterprise-B2B-admin default. No cramped gray-on-gray tables. No modal-for-everything. No tab-and-form-grid configuration panels that look like they came from a 2014 IT console. It also rejects the AI-startup-template look: no purple gradients, no hero-metric tiles, no glassmorphism, no "sparkle" iconography. The aesthetic lane is Notion + Vercel dashboard, leaning Vercel: strong typography, content-led layout, tonal depth without shadows.

**Key Characteristics:**

- Warm-dark surface as the default. `beige-1000` (#181818) is the page, not pure black.
- Single brand accent. `blue-200` periwinkle, used sparingly on primary affordances.
- Single typeface. Borna carries every weight; no display/body pairing.
- Flat at rest. Depth is conveyed through four tonal background steps, never through shadow.
- Quiet, low-chrome components. Borders are subtle, fills are deliberate, decoration is absent.

## 2. Colors

A warm-dark neutral scale anchors the system; one cool brand accent (periwinkle blue) carries identity; semantic colors are reserved for actual state.

### Primary

- **`blue-200`** (#c3c7fc): The brand accent. Used as the background for primary buttons (with `beige-1000` text, a high-contrast inversion against the dark surface), as the foreground for outline buttons and links, and as the focus ring. Light cool blue against warm dark is the signature visual.
- **`blue-300`** (#a6acfb): Brand-hover. Slightly brighter periwinkle for primary-button hover and outline-button hover.
- **`blue-600`** (#62659d): Brand-disabled. Desaturated, lower-lightness periwinkle for disabled brand surfaces.

### Neutral (the warm-dark workshop)

- **`beige-1000`** (#181818): Surface primary. The page background, primary cards, secondary-button surface. The "room".
- **`beige-900`** (#2a2a29): Surface secondary. The canvas behind cards, table-row default, hover-surface for secondary buttons.
- **`beige-800`** (#3f3d3c): Surface tertiary. Tertiary buttons, striped-row alternation, chip subtle background.
- **`beige-700`** (#555352): Surface faded. Border-checkbox, faded surfaces, tertiary-button hover.
- **`beige-0`** (#ffffff): Text primary. White on warm-dark is the canonical body-text contrast.
- **`beige-100`** (#e9e3dd): Text secondary. Warm off-white, used for secondary body text and ghost-button label.
- **`beige-300`** (#b6b1ad): Text tertiary. Quieter labels, metadata, supporting text.
- **`beige-500`** (#84807d): Text faded. The lowest text contrast that still passes AA against `beige-900`; used for disabled, placeholder, helper text.

### Semantic

Reserved for state, never decorative.

- **`green-500`** (#648b54): Success. Text-success, success-button background.
- **`red-500`** (#dd5151): Error / danger. Text-error, danger-button background, validation messages.
- **`yellow-500`** (#8e8227): Warning. Warning-button background. Note: the text-warning role uses `orange-500` (#c46652) instead; warning is split across two roles by historical drift.
- **`orange-300`** (#fe9680): Warm-accent reserve. Available in the palette but used sparingly; not part of the core brand affordances.

### Named Rules

**The One Accent Rule.** `blue-200` periwinkle is the only chromatic identity color. It carries primary affordance, focus, and link state. Do not introduce a second brand color, do not stack purples next to it, and do not promote orange or yellow to brand status. They are semantic warnings, not personality.

**The Warm-Neutral Rule.** Neutrals are beige, not gray. Every "background" or "border" choice resolves to a `beige-*` token. Cool grays (`#1e1e1e`, `#2b2b2b` slate-style) are forbidden; they break the workshop warmth that distinguishes Packmind from the generic dark-tool template.

**The Inverted-Primary Rule.** The primary button is _light on dark_: `blue-200` background, `beige-1000` text. Resist the reflex to make primary buttons dark with a glowing accent. The inversion is what makes the brand visible against a dark page.

## 3. Typography

**Display / Body / Label Font:** Borna (with `sans-serif` fallback).

**Character:** Borna is the single voice. It is a contemporary humanist sans with quietly distinctive details: slightly open apertures, low contrast, comfortable on screen at body size and confident at display size. Using one family at four weights (regular/medium/bold and italics) avoids the pairing-anxiety of editorial systems while still giving every hierarchy step a clear identity.

### Hierarchy

- **Display** (700, 2rem / 32px, line-height 1.5, letter-spacing -0.025em): Hero headlines on landing surfaces inside the app, large page titles. Used sparingly: at most one per screen.
- **Headline** (700, 1.5rem / 24px, line-height 1.5, letter-spacing -0.025em): Section titles, modal titles, major navigation labels.
- **Title** (500, 1.25rem / 20px, line-height 1.4): Card titles, list-item titles, subsection headers.
- **Subtitle** (500, 1.125rem / 18px, line-height 1.4): Minor section dividers, dense lists.
- **Body** (400, 0.9375rem / 15px, line-height 1.4, max 65–75ch in reading surfaces): Default running text, descriptions, form values. The 15px body (between 14 and 16) is deliberate: dense enough for governance lists, large enough for editorial reading.
- **Label** (500, 0.875rem / 14px, line-height 1.3, letter-spacing 0.025em): Small caps-style labels, form-field labels, button text in compact contexts.
- **Small** (400, 0.8125rem / 13px, line-height 1.3): Metadata, timestamps, helper text, table footnotes.

### Named Rules

**The Single-Voice Rule.** Borna does all the work. Do not pair it with a display serif, a mono accent face for headlines, or a secondary sans. Mono is acceptable inside code blocks (system mono stack); nowhere else.

**The Weight-and-Scale Rule.** Hierarchy is established through scale and weight contrast, never through color. A title is not "the blue one"; it is the larger, heavier one. Color stays in the neutral ramp.

**The 65–75ch Rule.** Reading surfaces (the artifact editor, change-review pane, documentation panels) cap body line length at 65–75ch. Governance lists and tables are exempt; density is the point there.

## 4. Elevation

Packmind is **flat by default with tonal layering**. There are no shadow tokens defined in the design system. Depth is conveyed exclusively through the four-step background ramp: `beige-1000` → `beige-900` → `beige-800` → `beige-700`. A card on the page is `beige-1000` over `beige-900`; a striped row inside a table is `beige-800` against `beige-900`; a focused input draws contrast from its border and surface, not from a glow.

### Named Rules

**The Flat-By-Default Rule.** No element is elevated at rest. No `box-shadow` on cards, panels, headers, or tabs. If a surface needs to feel above another, change its tonal step on the beige ramp; do not add a shadow.

**The Tonal-Depth Rule.** Stack at most three tonal steps in any single composition (e.g. page `beige-900`, card `beige-1000`, hovered row inside the card `beige-800`). More than three steps in a single visual stack reads as visual noise and collapses the hierarchy.

**The Overlay Exception.** Modals, menus, toasts, and combobox popovers may use a single subtle drop-shadow inherited from Chakra defaults to detach from the page beneath. Treat this as an exception, not a vocabulary. Never copy that shadow onto in-flow surfaces (cards, panels, table rows). If the shadow shows up anywhere except a true overlay, it is wrong.

## 5. Components

Component character: **quiet, content-first, low-chrome.** Chrome (borders, fills, hover treatments) is minimal and deliberate. Affordance is communicated through color contrast and type, not through decoration.

### Buttons

- **Shape:** Gently rounded corners (`rounded-md`, 0.25rem / 4px). Never pill-shaped, never square.
- **Primary:** Periwinkle on near-black: `blue-200` (#c3c7fc) background, `beige-1000` (#181818) text. Padding 0.5rem 1rem. The light-on-dark inversion is intentional and load-bearing.
  - Hover: background shifts to `blue-300` (#a6acfb).
  - Disabled: background `blue-600` (#62659d), text `beige-800`.
- **Secondary:** Surface matched to the page: `beige-1000` background with a subtle `beige-900` border. Used as the default action in dense areas where two primary buttons would compete.
  - Hover: background lifts to `beige-900`, text drops to `beige-200`.
- **Tertiary:** `beige-800` background, `beige-200` text. The quietest filled affordance; used in toolbars and compact controls.
  - Hover: `beige-700` background.
- **Outline:** Transparent background, `blue-200` border and text. Medium font weight. Used for promoted secondary actions inside the brand voice.
  - Hover: border and text shift to `blue-300`.
- **Danger / Success / Warning:** Solid semantic: `red-500` / `green-500` / `yellow-500` background, `beige-0` text. Reserved for destructive, confirming, or cautionary actions; never decorative.
- **Ghost:** Transparent background, no border, no padding. Used as text-only triggers inside menus, icon-only triggers in toolbars.

### Inputs / Fields

- **Style:** `beige-1000` background (matches primary surface), `beige-0` text, `rounded-md` corners, internal padding 0.5rem 0.75rem.
- **Border:** Implicit; derived from surface contrast against the page, not from a heavy stroke.
- **Focus:** Periwinkle focus ring (`blue-200`). The focus ring is the visible affordance; do not suppress it for visual quietness.
- **Disabled:** `beige-500` text, no border change.
- **Error:** `red-500` border, error message below the field in `text-error` (`red-500`).

### Cards / Containers

- **Corner Style:** `rounded-md` (0.25rem).
- **Background:** `beige-1000` against a `beige-900` page; one tonal step above the canvas.
- **Shadow Strategy:** None. See Elevation.
- **Border:** Optional, `beige-900` if present. Most cards rely on the tonal step alone.
- **Internal Padding:** `1rem` (lg) default; `0.75rem` (md) for compact density.

### Tables

- **Row:** `beige-900` background, `beige-0` text.
- **Striped row:** `beige-800` alternate (when striped variant is enabled).
- **Column header:** `beige-1000` background, `beige-0` text. Slightly higher contrast than the rows; anchors the head.
- **Cell border:** `beige-1000` bottom border on line variant.
- **Density:** Comfortable. Row height should accommodate the body 15px line at line-height 1.4 with 0.75rem vertical padding. Resist AntD-style 32px rows.

### Chips / Tags

- **Style:** `beige-800` background, `beige-200` text, `rounded-sm` (0.125rem), padding 0.125rem 0.5rem. Quiet by default.
- **Semantic variants:** Use the `*.subtle` / `*.fg` semantic-token pair (e.g. `green.subtle` background with `green.fg` text) for state chips. Never stack multiple semantic chips in a single row without a clear hierarchy of meaning.

### Navigation

- **Primary nav:** `beige-1000` surface against the `beige-900` page. Active item: `blue-200` text or left-anchored indicator (1px, no thicker). Inactive: `beige-100` text. Hover: `beige-0` text.
- **Tabs:** Underline-style. Active tab: 2px `blue-200` underline, `beige-0` text. Inactive: `beige-300` text. No filled-pill tabs.

### Dialogs / Modals

- **Surface:** `beige-1000`, `rounded-md`, single overlay shadow from Chakra default.
- **Backdrop:** `beige-1000` at ~70% opacity over the page; no blur.
- **Use sparingly.** Modals are the lazy answer. Prefer inline disclosure (an expanded row, a side-panel that pushes the page), reserve modals for genuinely disruptive flows (destructive confirmation, blocking auth, single-task wizards).

### PMMarkdownViewer (signature)

Packmind's artifact editor and preview lean on a Markdown viewer that styles content inside the editorial register: 65–75ch line length, body type, subtle dividers in `beige-800`, inline code in a system mono stack with `beige-900` background. Treat this as the canonical "reading surface" template; new content-heavy views should match its rhythm.

## 6. Do's and Don'ts

### Do:

- **Do** use `blue-200` (#c3c7fc) as the single brand accent: on primary buttons, focus rings, outline buttons, and active-nav indicators.
- **Do** use the inverted primary button (light periwinkle on near-black text) as the canonical primary affordance.
- **Do** convey depth through the four-step `beige-1000` → `beige-900` → `beige-800` → `beige-700` ramp, with at most three steps stacked in one composition.
- **Do** keep all text in the neutral ramp (`beige-0` → `beige-500`) for body and labels; reserve color for state.
- **Do** use Borna for every hierarchy step; vary scale and weight, not family.
- **Do** cap body line length at 65–75ch in reading surfaces (artifact editor, change review, docs panels).
- **Do** prefer inline disclosure and side-panels to modals; modals are reserved for genuinely disruptive flows.
- **Do** surface governance state (version, owner, deployment, adoption) in the primary view, not behind a History tab.

### Don't:

- **Don't** use cramped gray-on-gray data tables, modal-for-everything flows, or tab-and-form-grid configuration panels: the enterprise-B2B-admin default that PRODUCT.md names as the single biggest trap.
- **Don't** introduce purple gradients, hero-metric tiles, glassmorphism, identical card grids, or AI-sparkle iconography. These are the generic AI-startup template.
- **Don't** use developer-cool maximalism: neon terminals, scroll-triggered animations, 3D logos.
- **Don't** use pure `#000` or `#fff` for surfaces. Backgrounds are warm `beige-*`; "white" text is `beige-0` (#ffffff) only because it is the lightest beige step.
- **Don't** use cool slate grays (`#1e1e1e`, `#2b2b2b`) as neutrals. Neutrals are beige.
- **Don't** add `box-shadow` to cards, panels, table rows, headers, or tabs. Shadows live only on true overlays (modals, menus, toasts).
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, alerts, or list items. Never. Rewrite with full borders, background tints, or leading icons.
- **Don't** apply `background-clip: text` with a gradient (gradient text). Use a solid color; emphasize with weight or size.
- **Don't** pair Borna with a serif display face, a mono headline, or a secondary sans. One voice.
- **Don't** introduce a second brand color. Periwinkle is the only chromatic identity; orange/yellow/purple are not brand.
- **Don't** rely on color alone to convey status. Pair every semantic color with text, icon, or position (deployment state, diff state, success/error).
- **Don't** use em dashes in UI copy. Commas, colons, semicolons, periods, parentheses. Also not `--`.
