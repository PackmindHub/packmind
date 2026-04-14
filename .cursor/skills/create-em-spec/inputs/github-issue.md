# Input Handler: GitHub Issue

## Retrieving the Issue

Use `gh issue view <number-or-url> --json title,body,labels,comments` to fetch the issue content.

If the user provided a URL, extract the owner/repo and issue number from it. If they provided just a number, use the current repository.

## Extraction Rules

Parse the issue body and comments to identify:

### User Story
- The issue title becomes the EM spec title
- Look for a user story statement ("As a... I want... So that...") in the body

### Rules
- **Acceptance criteria** (checkboxes, numbered lists, or "AC" sections) map to **Rules**
- Each acceptance criterion becomes one Rule with a descriptive title
- If the criterion includes specific scenarios or examples, create Examples under that Rule

### Examples
- Look for "given/when/then", "if/then", or scenario descriptions — these map directly to Setup/Action/Outcome
- If an acceptance criterion has no explicit scenarios, generate at least one Example that illustrates the expected behavior and one that illustrates an edge case or failure

### Technical Rules
- Look for non-functional requirements: performance constraints, validation rules, character limits, authorization requirements
- Check labels for hints (e.g., "security", "performance")
- Extract any implementation constraints mentioned in comments

### User Events
- Look for mentions of analytics, tracking, events, or telemetry
- Extract event names and properties if specified

### Check Also
- Extract edge cases, special mentions, and "don't forget" notes from comments
- Look for linked issues or PRs that add context

## Handling Sparse Issues

If the issue has minimal content (just a title and a few lines), do your best to generate a skeleton spec with:
- One Rule derived from the title
- One or two Examples based on reasonable assumptions
Then immediately ask the user to fill in the gaps before writing the spec. Do not write inferred content — only write what has been confirmed.
