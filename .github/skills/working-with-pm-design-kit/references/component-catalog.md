# PM Component Catalog

Complete inventory of all PM-prefixed components in `@packmind/ui`, organized by category. Source: `packages/ui/src/lib/components/`.

## Typography

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMHeading** | `level?: 'h1'–'h6'`, `color?: 'primary'\|'secondary'\|'tertiary'\|'faded'\|'primaryLight'\|'secondaryLight'\|'tertiaryLight'` | Use `level` for semantic HTML, not `as` |
| **PMText** | `variant?: 'body'\|'body-important'\|'small'\|'small-important'`, `color?: 'primary'\|'secondary'\|'tertiary'\|'error'\|'faded'\|'warning'\|'success'\|'primaryLight'\|'secondaryLight'\|'tertiaryLight'`, `as?: 'span'\|'p'\|'div'` | |
| **PMLink** | `variant?: 'plain'\|'navbar'\|'underline'\|'active'`, `to?: string` | Plain by default |
| **PMEm** | Chakra EmProps | Emphasis/italic text |
| **PMList** | Chakra ListProps | Ordered/unordered lists |

## Form Controls

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMInput** | `label?: string`, `error?: string`, `helperText?: string`, `maxLength?: number` (default: 255) | Tertiary background, transparent border until error |
| **PMTextArea** | Chakra TextareaProps | Tertiary background |
| **PMLabel** | `required?: boolean`, `htmlFor?: string` | Renders `<label>` element |
| **PMButton** | `variant?: 'primary'\|'secondary'\|'tertiary'\|'outline'\|'ghost'\|'success'\|'warning'\|'danger'` | Primary by default |
| **PMIconButton** | `variant?: 'solid'\|'subtle'\|'surface'\|'outline'\|'ghost'\|'plain'\|'tertiary'` | Ghost by default |
| **PMButtonGroup** | Chakra ButtonGroupProps | Groups buttons together |
| **PMCheckbox** | `icon?: ReactNode`, `inputProps?`, `controlProps?`, `labelProps?` | Compound component |
| **PMCheckboxGroup** | Chakra CheckboxGroupProps | Groups checkboxes |
| **PMCheckboxCard** | Chakra CheckboxCardProps | Card-style checkbox |
| **PMRadioGroup** | Chakra RadioGroupProps | Radio button group |
| **PMRadioCard** | Chakra RadioCardProps | Card-style radio |
| **PMSelect** | Chakra Select + `.ItemGroupLabel`, `.CollapsibleItemGroup` | Use `pmCreateListCollection` helper |
| **PMNativeSelect** | Chakra NativeSelectProps | Standard HTML select |
| **PMCombobox** | Chakra ComboboxProps | Searchable select |
| **PMSwitch** | `inputProps?`, `rootRef?` | Toggle switch |
| **PMField** | Chakra FieldRootProps | Form field wrapper |
| **PMFieldset** | Chakra FieldsetProps | Fieldset grouping |
| **PMEditable** | Chakra EditableProps | Inline editable text |
| **PMInputGroup** | Chakra InputGroupProps | Input with addons |
| **PMSegmentGroup** | Chakra SegmentGroupProps | Segmented control |
| **PMFormContainer** | `maxWidth?: string` (default: '400px'), `spacing?: number` (default: 4), `padding?: string\|number` (default: 6), `centered?: boolean` (default: true) | VStack in Container |
| **PMEllipsisMenu** | `actions: {value, onClick, content}[]`, `title?: string`, `disabled?: boolean` | Three-dot menu button |
| **PMCodeMirror** | `language?: string` (20+ languages), ReactCodeMirrorProps | Dracula theme |

## Layout

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMBox** | Chakra BoxProps | Basic container |
| **PMFlex** | Chakra FlexProps | Flex container |
| **PMVStack** | Chakra StackProps | Vertical stack with gap |
| **PMHStack** | Chakra StackProps | Horizontal stack with gap |
| **PMGrid** | Chakra GridProps | CSS Grid container |
| **PMGridItem** | Chakra GridItemProps | Grid child |
| **PMSeparator** | Chakra SeparatorProps | Horizontal/vertical divider |
| **PMPortal** | Chakra PortalProps | Portal for overlays |
| **PMHeader** | `color: 'primary'\|'secondary'\|'tertiary'` | Sticky nav bar |
| **PMVerticalNav** | `headerNav?`, `footerNav?`, `logo?: boolean`, `width?: string` (default: '220px') | Sidebar navigation |
| **PMVerticalNavSection** | `title?`, `titleExtra?`, `navEntries: ReactNode[]` | Section within nav |
| **PMTwoColumnsLayout** | `breadcrumbComponent`, `leftColumn`, `rightColumn` | 320px left, fluid right |

## Content

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMPage** | `title?`, `titleLevel?`, `subtitle?`, `titleAction?`, `breadcrumbComponent?`, `actions?`, `sidebar?`, `maxWidth?` (default: '1200px'), `isFullWidth?` | Full-page layout |
| **PMPageSection** | `title?`, `titleComponent?`, `cta?`, `variant?: 'plain'\|'outline'`, `backgroundColor?: 'primary'\|'secondary'\|'tertiary'`, `collapsible?: boolean` | Collapsible section |
| **PMTable** | `columns: PMTableColumn[]`, `data: T[]`, `striped?`, `hoverable?`, `size?: 'sm'\|'md'\|'lg'`, `selectable?`, `onSort?` | Column config: `{key, header, width?, align?, grow?, sortable?}` |
| **PMBadge** | Chakra BadgeProps | Status indicators |
| **PMAvatar** | Chakra AvatarProps | User/entity avatar |
| **PMBreadcrumb** | `segments: ReactNode[]`, `interactive?: boolean` | "/" separator |
| **PMCard** | Chakra CardProps | Card container |
| **PMIcon** | Chakra IconProps | Icon wrapper |
| **PMImage** | Chakra ImageProps | Image element |
| **PMCloseButton** | Chakra CloseButtonProps | Close "X" button |
| **PMEmptyState** | `title: string`, `description?: string`, `icon?: ReactNode`, `children?: ReactNode` | Title as h3, children for actions |
| **PMMarkdownViewer** | `content?: string`, `htmlContent?: string`, `sanitize?: boolean` (default: true) | DOMPurify + marked |
| **PMDataList** | `items: {label, value}[]` | Key-value pair display |
| **PMFeatureFlag** | `featureKeys: string[]`, `featureDomainMap`, `userEmail?` | Conditional rendering |
| **PMStat** | Chakra StatProps | Statistic display |

## Feedback & Overlays

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMToaster** / **pmToaster** | `pmToaster.create({type, title, description, action?, closable?})` | Types: `success`, `error`, `warning`, `info`, `loading`. Placement: bottom-end |
| **PMAlert** | Chakra AlertProps | Compound: `.Root`, `.Indicator`, `.Title`, `.Description` |
| **PMConfirmationModal** | `trigger`, `title`, `message`, `confirmText?` ('Delete'), `cancelText?` ('Cancel'), `confirmColorScheme?` ('red'), `onConfirm`, `open?`, `onOpenChange?`, `isLoading?` | Slot components: `PMConfirmationModalHeader`, `PMConfirmationModalBody`, `PMConfirmationModalFooter` |
| **PMAlertDialog** | Same as PMConfirmationModal | Alternative confirmation pattern |
| **PMDialog** | Chakra DialogProps | Compound: `.Root`, `.Backdrop`, `.Positioner`, `.Content`, `.Header`, `.Title`, `.CloseTrigger` |
| **PMDrawer** | Chakra DrawerProps | Side panel overlay |
| **PMPopover** | Chakra PopoverProps | Contextual popup |
| **PMTooltip** | `label`, `placement?` ('top'), `disabled?`, `openDelay?` (500), `closeDelay?` (0), `showArrow?` (true) | Hover information |
| **PMSkeleton** | Chakra SkeletonProps | Loading placeholder |
| **PMSpinner** | Chakra SpinnerProps | Loading indicator |
| **PMProgress** | Chakra ProgressProps | Progress bar |
| **PMStatus** | Chakra StatusProps | Status indicator |
| **PMCopiable** | Compound: `.Root {value}`, `.Trigger`, `.Indicator` | Copy-to-clipboard |

## Navigation

| Component | Key Props | Notes |
|-----------|-----------|-------|
| **PMTabs** | `defaultValue`, `tabs: {value, triggerLabel, content?, disabled?}[]`, `scrollableContent?` | Sub-components: `PMTabsTrigger`, `PMTabsContent` |
| **PMAccordion** | Chakra AccordionProps | Compound: `.Root`, `.Item`, `.ItemTrigger`, `.ItemContent`, `.ItemIndicator` |
| **PMMenu** | Chakra MenuProps | Compound: `.Root`, `.Trigger` + all Chakra Menu members |
| **PMTreeView** | All Chakra TreeView members | Compound: `.Root`, `.Branch`, `.BranchContent`, `.Item`, `.ItemText`, etc. Helpers: `createTreeCollection`, `createFileTreeCollection` |
| **PMCarousel** | Chakra CarouselProps | Compound: `.Root`, `.Control`, `.NextTrigger`, `.PrevTrigger`, `.Item`, `.ItemGroup`, `.Indicator` |
| **PMTimeline** | Chakra TimelineProps | Compound: `.Root`, `.Item`, `.Content`, `.Separator`, `.Indicator`, `.Connector`, `.Title`, `.Description` |
