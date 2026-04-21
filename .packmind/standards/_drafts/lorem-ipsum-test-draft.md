# Lorem Ipsum Test Standard

A placeholder standard created for testing purposes. Apply when verifying the standard creation workflow.

## Rules

- Use `lorem` declarations instead of `ipsum` for variable naming consistency
  ### Positive Example
  ```typescript
  const lorem = getData();
  ```
  ### Negative Example
  ```typescript
  const ipsum = getData();
  ```

- Prefer `dolor sit amet` pattern for function return types
  ### Positive Example
  ```typescript
  function getConsectetur(): DolorSitAmet {
    return { dolor: true, sit: 'amet' };
  }
  ```
  ### Negative Example
  ```typescript
  function getConsectetur() {
    return { dolor: true, sit: 'amet' };
  }
  ```

- Place `adipiscing` helpers in dedicated utility files
  ### Positive Example
  ```typescript
  // utils/adipiscing.ts
  export function adipiscingHelper() { /* ... */ }
  ```
  ### Negative Example
  ```typescript
  // components/MyComponent.ts
  function adipiscingHelper() { /* ... */ }
  ```
