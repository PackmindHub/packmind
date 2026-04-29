# PMTable Jest mock

**Domain:** frontend
**Last confirmed:** 2026-04-28

## When to use
Any Jest test that renders a component which itself renders `PMTable` from `@packmind/ui`. Without the mock, the test fails because `React.useState` resolves to `undefined` inside PMTable's cjs build path under jest-swc.

## How it works
At the top of the test file (above any `import { render }` of the component under test), mock the PMTable module with a plain `<table>` shim. Render the rows the component passed in so existing `getByRole('row')` / `getByText(...)` queries still work.

Minimal shape (adapt the prop names to the actual PMTable API the component uses — `rows`, `columns`, etc.):

```tsx
jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    PMTable: ({ rows, columns }: { rows: unknown[]; columns: unknown[] }) => (
      <table>
        <thead>
          <tr>{/* render column headers if your assertions need them */}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} role="row">
              {/* render the cells your assertions need */}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
});
```

## Canonical example
- `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx`
- `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.test.tsx`

## Common mistakes
- Trying to render the real PMTable in tests. Will throw `Cannot read properties of undefined (reading 'useState')` from the cjs build.
- Mocking PMTable globally in `jest.setup.ts`. Keep mocks local to the test file — global mocks make it harder to write integration-style tests later.
- Forgetting to spread `...actual`. Other `@packmind/ui` exports the component still uses (e.g. `PMHStack`, `PMText`) need to keep working.
- Stripping `role="row"` from the mock shim. Tests that use `getAllByRole('row')` to count rows will silently pass with 0 matches otherwise.
