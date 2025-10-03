# Create your first standard

> A standard is an agreed-upon, documented set of rules or criteria that ensures consistent, compatible, and high-quality results across people, systems, or products.

Aligning a team on standards—and following them—is hard. Many teams end up with wikis and Markdown files that nobody reads or maintains.

With AI coding assistants, this problem becomes even more critical.

Let’s see how we can make written documentation useful again with **Packmind**.

:::info
Read more about the anatomy of a Packmind standard in the [dedicated section](./standards-management.md).
:::

## Create a standard from your codebase

:::warning
You need to connect your MCP server to your IDE. See the setup guide: [Get started with the MCP server](./gs-mcp-server-setup.md).
:::

1. Open your IDE and your coding assistant in **agentic mode**.
2. For this demo, we will create a language-agnostic standard. (You can also target a specific language or framework.)
3. Type this prompt:

```
Analyze our codebase and create a Packmind standard about error handling.
```

The agent will then call the `packmind_create_standard` MCP tool.

Your new standard will be available in the Packmind web app, in the **Standards** panel.

## Create a standard from the web app

1. Go to the **Standards** panel.
2. Click to create a new standard.
3. Fill in the following fields:

- **Name** — a short title that explains the topic (e.g., “Frontend code conventions”, “DDD architecture”).
- **Description** — context and benefits, for both coding assistants _and_ developers.
- **Rules** — a list of issues to avoid and coding rules to follow so the code complies with the standard.

### Example

```text
**Standard**: Error Handling

**Description**:
Ensure errors are handled predictably, with context, safety, and actionable feedback.
Non-goals: don’t use exceptions for control flow; don’t log the same error at multiple layers; don’t expose stack traces or internals in user-facing messages.

**Checklist for reviews**: validated inputs; no empty catch; structured errors; cause preserved; safe logs; careful retries; actionable responses.

**Scope**: Applies to all services, CLIs, UIs, and libraries.

**Rules**

1) Validate inputs at boundaries; fail fast

Bad (JavaScript):
// UI handler
submit(order); // accepts anything; crashes deeper

Good (JavaScript):
import { z } from "zod";
const Order = z.object({ id: z.string().min(1), items: z.array(z.string()).nonempty() });
const parsed = Order.safeParse(payload);
if (!parsed.success) {
  throw new ValidationError("Invalid order", { issues: parsed.error.issues });
}
submit(parsed.data);

2) Avoid swallowing errors; surface or handle them explicitly

Bad (JavaScript):
try {
  processPayment(tx);
} catch (e) {
  // ignored; system appears "successful"
}

Good (JavaScript):
try {
  await processPayment(tx);
} catch (e) {
  if (e instanceof PaymentGatewayError) {
    logger.warn("Payment failed", { txId: tx.id, code: e.code });
    throw new PaymentFailed("Could not process payment", { cause: e });
  }
  throw e; // unknown error, bubble up
}

3) Preserve context when rethrowing

Bad (JavaScript):
try {
  await repo.save(user);
} catch (e) {
  throw new Error("Save failed"); // loses original cause
}

Good (JavaScript):
class PersistenceError extends Error {
  constructor(message, options) { super(message, options); this.name = "PersistenceError"; }
}
try {
  await repo.save(user);
} catch (e) {
  throw new PersistenceError("Save failed: User", { cause: e });
}

4) Use structured, domain-specific error types

Bad (JavaScript):
throw new Error("Not found");

Good (JavaScript):
class NotFoundError extends Error {
  constructor(kind, key, options) {
    super(`${kind} not found`, options);
    this.name = "NotFoundError";
    this.kind = kind; this.key = key;
  }
}
throw new NotFoundError("User", userId);

5) Log safely and meaningfully (no secrets; include identifiers)

Bad (JavaScript):
console.error("Auth failed for", credentials.password); // leaks secret

Good (JavaScript):
logger.error("Auth failed", { userId, ip, reason: "invalid_credentials" }); // no secret/PII

6) Retry deliberately with backoff only for safe, transient operations

Bad (JavaScript):
// Blind retry of a non-idempotent call
for (let i = 0; i < 5; i++) {
  await chargeCard(request); // may double-charge
}

Good (JavaScript):
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const res = await fetch(url, { method: "GET" }); // idempotent
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    break;
  } catch (e) {
    if (attempt === 2) throw new CacheUnavailable("Timed out", { cause: e });
    await sleep(2 ** attempt * 200); // exponential backoff
  }
}

7) Return actionable messages to callers; hide internals

Bad (JavaScript/JSON):
{ "error": "TypeError: Cannot read properties of undefined (reading 'email') at UserService.js:142:17" }

Good (JavaScript/JSON):
{ "error": { "code": "USER_NOT_FOUND", "message": "The user does not exist.", "requestId": "c1a9..." } }
```
