User Story Review: {Title of the user story}

# Rule 1: {Short rule title describing the expected behavior}

## Example 1

{Setup: describe the initial state}

{Action: describe what the user does}

{Outcome: describe the expected result}

## Example 2

{Setup}

{Action}

{Outcome}

# Rule 2: {Short rule title}

## Example 1

{Setup}

{Action}

{Outcome}

# Technical rules

- {Implementation constraint that applies across frontend and backend, e.g., "Slug generation must be deterministic and locale-independent"}
- {Performance or infrastructure constraint, e.g., "The operation must be idempotent"}
- {Security or authorization constraint, e.g., "Only organization admins can perform this action"}
- {Data constraint, e.g., "Max length for the name field: 64 characters"}
- {Integration constraint, e.g., "Must work on both Linux and Windows (normalize paths)"}

# User Events

- `{event_name}`: emitted when {trigger description}. Properties: `{property1}`, `{property2}`
- `{event_name}`: emitted when {trigger description}. Properties: `{property1}`

---

Check also the following rules are applied:

- {Additional business rule or constraint not covered by the rules above}
- {Edge case to verify, e.g., "Two items in the same scope cannot have the same name"}
- {Default behavior, e.g., "By default, the user lands on the default space"}
