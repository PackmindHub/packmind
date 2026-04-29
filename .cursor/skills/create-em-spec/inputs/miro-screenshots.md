# Input Handler: Miro Screenshots

## Receiving Screenshots

The user will provide one or more screenshots from a Miro board captured during an Example Mapping workshop. These may arrive:
- As file paths to local images
- Across multiple messages (iterative — don't wait for all screenshots at once)

Use the **Read** tool to view each image. Miro EM workshops typically use a visual layout with colored sticky notes.

## Visual Conventions in Example Mapping Workshops

The team uses a specific color-coded sticky note system on Miro:

| Color | Meaning | Maps to |
|-------|---------|---------|
| **Yellow** | The **User Story** (title / goal) — usually one sticky at the top center | Spec title |
| **Blue** | **Rules** — business rules or acceptance criteria, arranged as column headers | Rules (`# Rule N`) |
| **Green** | **Examples** — concrete scenarios illustrating a rule, always placed **below** the blue rule they belong to | Examples (`## Example N`) |
| **Purple** | **Tips & advice** — implementation guidance, architectural decisions, or patterns discussed during the workshop | Technical rules or Check Also |
| **Orange** | **Events** — analytics/tracking events expected to be sent (e.g., to Amplitude) | User Events |
| **Red / Pink** | **Questions or warnings** — open questions, edge cases, or high-level concerns | Ask user for clarification, then add to Check Also |

### E2E Tag

Some green stickies (examples) may have a small **"E2E"** tag. This means the example should be covered by an end-to-end test. In the spec, annotate these examples with `<!-- E2E -->` after the example heading so the `qa-review` skill can flag missing E2E coverage.

## Extraction Rules

### User Story
- Look for the yellow sticky note at the top — its text becomes the spec title
- If no clear yellow sticky, use the board title or the most prominent heading

### Rules
- Each blue sticky becomes a **Rule** in the spec
- The sticky text becomes the Rule title
- Blue stickies are arranged as **columns** — read left-to-right to determine rule numbering
- Green stickies below a blue sticky belong to that rule

### Examples
- Green stickies grouped below a blue sticky become **Examples** for that Rule
- Each green sticky typically contains a short scenario narrative (who, what context, what happens)
- **Never reformulate.** Transcribe the sticky note text verbatim. Only split it into Setup / Action / Outcome sections if needed, but keep the original wording exactly as written on the sticky.
- If the sticky has an **E2E** tag, add `<!-- E2E -->` after the `## Example N` heading
- If the sticky is just a short phrase, ask the user to clarify the full scenario before writing it into the spec

### Tips and Advice (Purple stickies)
- Purple stickies contain implementation guidance or architectural decisions from the team
- If the tip is a code pattern or constraint (e.g., `no "if (isSpaceAdmin() || isOrgaAdmin) {...}"`), add it to **Technical rules**
- If the tip is a general recommendation or reminder, add it to **Check Also**
- Preserve code snippets in backticks

### Events (Orange stickies)
- Orange stickies list analytics events to track (typically Amplitude events)
- Each becomes an entry in the **User Events** section
- Event names are usually in `snake_case` (e.g., `space_members_added`)
- If the sticky specifies properties or a trigger, include them. Otherwise, ask the user what properties should be tracked

### Questions and Warnings (Red/Pink stickies)
- Red/pink stickies represent open questions or warnings from the workshop
- Present these questions to the user and ask for resolution before writing into the spec
- Do not write unresolved questions into the spec — the spec must only contain decided items

## Handling Multiple Screenshots

When the user sends multiple screenshots:
1. Process each one and merge into the existing spec
2. Watch for **duplicates** — the same sticky may appear in overlapping screenshots
3. When merging, inform the user: "I found N new rules and M new examples from this screenshot. Here's what was added: ..."

## Handling Non-English Content

Sticky notes may be written in French or another language. The output spec must always be in English:
- Translate all sticky note text to English in the spec
- Preserve the original text in parentheses so the user can validate, e.g., `Rule 1: A space name must be unique (original: "Le nom d'un espace doit etre unique")`
- Once the user validates, the parenthetical original text can be removed in a subsequent iteration

## Self-Review: Re-Read the Image

After extracting all content from the screenshots, you **must** re-read each image at least **twice** before generating the spec. This catches ~90% of extraction errors (missed stickies, wrong rule assignments, misread text). The images are already loaded in context — re-reading them costs nothing.

## Handling Low-Quality or Ambiguous Screenshots

If text on stickies is hard to read:
- Ask the user to confirm or correct what the text says before writing it into the spec

If the board layout is non-standard (no clear color coding):
- Ask the user to explain the layout conventions before proceeding
