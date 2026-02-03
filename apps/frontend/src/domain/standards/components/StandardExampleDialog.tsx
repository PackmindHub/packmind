import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMIcon,
  PMPortal,
} from '@packmind/ui';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { LuBook } from 'react-icons/lu';

interface StandardExample {
  title: string;
  buttonLabel: string;
  content: string;
}

const TESTING_WITH_REACT_JEST_EXAMPLE: StandardExample = {
  title: 'Testing with React & Jest',
  buttonLabel: 'Test with React and Jest',
  content: `# Standard — Testing with React & Jest

This standard defines how our team writes frontend tests in React projects.

## Rules

### 1. Test user outcomes

✅ Do

\`\`\`ts
it("submits the form when the user clicks Save", async () => {
  render(<ProfileForm />)

  await userEvent.type(screen.getByLabelText("Name"), "Alice")
  await userEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(await screen.findByText("Profile updated")).toBeVisible()
})
\`\`\`

❌ Don't

\`\`\`ts
it("renders the Save button", () => {
  render(<ProfileForm />)

  expect(screen.getByText("Save")).toBeInTheDocument()
})
\`\`\`

---

### 2. Query elements like a user

✅ Do

\`\`\`ts
screen.getByRole("button", { name: "Continue" })
screen.getByLabelText("Email address")
\`\`\`

❌ Don't

\`\`\`ts
screen.getByTestId("continue-btn")
\`\`\`

---

### 3. Keep one behavior per test

✅ Do

\`\`\`ts
it("shows an error message when login fails", async () => {
  render(<LoginForm />)

  await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

  expect(await screen.findByText("Invalid credentials")).toBeVisible()
})
\`\`\`

❌ Don't

\`\`\`ts
it("handles login correctly", async () => {
  render(<LoginForm />)

  expect(screen.getByRole("textbox")).toBeVisible()
  expect(screen.getByRole("button")).toBeEnabled()
})
\`\`\`

---

### 4. Name tests with clear statements

✅ Do

\`\`\`ts
it("renders an error when the password is too short", () => {
  ...
})
\`\`\`

❌ Don't

\`\`\`ts
it("should render an error when the password is too short", () => {
  ...
})
\`\`\`

---

### 5. Avoid implementation details

✅ Do

\`\`\`ts
it("expands the details panel when the user clicks More", async () => {
  render(<ProductDetails />)

  await userEvent.click(screen.getByRole("button", { name: "More" }))

  expect(screen.getByText("Technical specifications")).toBeVisible()
})
\`\`\`

❌ Don't

\`\`\`ts
it("sets isExpanded to true", () => {
  const wrapper = shallow(<ProductDetails />)

  expect(wrapper.state("isExpanded")).toBe(true)
})
\`\`\``,
};

const CLEAN_ARCHITECTURE_EXAMPLE: StandardExample = {
  title: 'Clean Architecture Conventions',
  buttonLabel: 'Clean Architecture Conventions',
  content: `# Standard — Clean Architecture Conventions

This standard defines how our team structures codebases to maintain clear boundaries, scalability, and long-term readability.

AI coding agents must follow these conventions when generating or modifying code.

---

## Rules

### 1. Separate UI from business logic

✅ Do

\`\`\`ts
// features/billing/useCases/createInvoice.ts
export async function createInvoice(input: CreateInvoiceInput, deps: Deps) {
  const invoice = Invoice.create(input)
  await deps.invoiceRepository.save(invoice)
  return invoice
}

// features/billing/ui/CreateInvoicePage.tsx
export function CreateInvoicePage({ deps }: { deps: Deps }) {
  const onSubmit = async (input: CreateInvoiceInput) => {
    await createInvoice(input, deps)
  }

  return <InvoiceForm onSubmit={onSubmit} />
}
\`\`\`

❌ Don't

\`\`\`ts
export function CreateInvoicePage() {
  const onSubmit = async (input: CreateInvoiceInput) => {
    const invoice = Invoice.create(input)
    await fetch("/api/invoices", { method: "POST", body: JSON.stringify(invoice) })
  }

  return <InvoiceForm onSubmit={onSubmit} />
}
\`\`\`

---

### 2. Keep dependencies flowing inward

Domain and use-cases must not depend on UI or infrastructure libraries.

✅ Do

\`\`\`ts
// domain/User.ts
export class User {
  constructor(public readonly email: string) {}
}

// useCases/registerUser.ts
import { User } from "../domain/User"

export async function registerUser(email: string, repo: UserRepository) {
  const user = new User(email)
  await repo.save(user)
  return user
}
\`\`\`

❌ Don't

\`\`\`ts
// domain/User.ts
import axios from "axios" // ❌ domain depends on infrastructure

export class User {
  async save() {
    await axios.post("/users", this)
  }
}
\`\`\`

---

### 3. Depend on interfaces, not implementations

Use-cases should accept abstractions (ports) and infrastructure should implement them.

✅ Do

\`\`\`ts
// domain/ports/UserRepository.ts
export interface UserRepository {
  save(user: User): Promise<void>
}

// infra/PostgresUserRepository.ts
export class PostgresUserRepository implements UserRepository {
  async save(user: User) {
    // implementation details here
  }
}
\`\`\`

❌ Don't

\`\`\`ts
import { PostgresUserRepository } from "../infra/PostgresUserRepository"

export async function registerUser(email: string) {
  const repo = new PostgresUserRepository() // ❌ use-case tied to infra
  await repo.save(new User(email))
}
\`\`\`

---

### 4. Organize code by feature

Group files by domain/feature instead of technical buckets.

✅ Do

\`\`\`txt
/features/auth
  /domain
  /useCases
  /ui
  /infra
/features/billing
  /domain
  /useCases
  /ui
  /infra
\`\`\`

❌ Don't

\`\`\`txt
/components
/services
/repositories
/hooks
/utils
\`\`\`

---

### 5. Hide internals behind a public API

Expose only what other features need. Keep internals private to the feature.

✅ Do

\`\`\`ts
// features/auth/index.ts (public API)
export { AuthProvider } from "./ui/AuthProvider"
export { useAuth } from "./ui/useAuth"
export type { AuthUser } from "./domain/AuthUser"

// features/auth/useCases/login.ts (internal)
export async function login(...) { ... }
\`\`\`

❌ Don't

\`\`\`ts
// Other features importing deep internals ❌
import { login } from "../features/auth/useCases/login"
import { AuthUser } from "../features/auth/domain/AuthUser"
\`\`\`
`,
};

const STANDARD_EXAMPLES = [
  TESTING_WITH_REACT_JEST_EXAMPLE,
  CLEAN_ARCHITECTURE_EXAMPLE,
];

interface StandardExampleDialogButtonProps {
  example: StandardExample;
}

const StandardExampleDialogButton = ({
  example,
}: StandardExampleDialogButtonProps) => {
  return (
    <PMDialog.Root
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary" w="fit-content">
          <PMIcon>
            <LuBook />
          </PMIcon>{' '}
          Example: {example.buttonLabel}
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Standard Example: {example.title}</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={example.content}
                  readOnly
                  paddingVariant="none"
                />
              </MarkdownEditorProvider>
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

export const StandardExampleDialog = () => {
  return (
    <PMHStack mt={4} gap={2}>
      {STANDARD_EXAMPLES.map((example) => (
        <StandardExampleDialogButton key={example.title} example={example} />
      ))}
    </PMHStack>
  );
};
