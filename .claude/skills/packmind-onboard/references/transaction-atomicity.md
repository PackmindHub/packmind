# Transaction & Atomicity Conventions

Identify how multi-step writes are coordinated and where patterns are bypassed.

## Search Patterns

### Transaction Wrapper Patterns

```
# TypeORM
@Transaction(
transaction(
.transaction(
getManager().transaction
queryRunner.startTransaction
queryRunner.commitTransaction
queryRunner.rollbackTransaction
EntityManager (in transaction context)

# Prisma
prisma.$transaction
.$transaction([
.$transaction(async

# Sequelize
sequelize.transaction
t.commit()
t.rollback()
{ transaction: t }

# Knex
knex.transaction
trx.commit()
trx.rollback()

# Generic patterns
BEGIN
COMMIT
ROLLBACK
START TRANSACTION

# Decorators/annotations
@Transactional
@transaction
with_transaction
```

### Unit of Work Patterns

```
# Explicit UoW
UnitOfWork
unitOfWork
uow.
.commit()
.flush()
.persist(
.save() (batch)

# Repository patterns with UoW
Repository.save(
.saveAll(
.bulkInsert(
.bulkUpdate(
```

### Outbox/Saga Patterns

```
# Outbox pattern
outbox
OutboxMessage
outbox_messages
publishAfterCommit
eventOutbox

# Saga pattern
Saga
saga
SagaStep
compensate
compensation
rollbackStep
orchestrator

# Event sourcing related
EventStore
eventStore
appendEvents
```

### No Transaction Indicators

```
# Multiple independent saves
await repo1.save(
await repo2.save(
await repo3.save(

# Fire-and-forget
.save().then(
Promise.all([save1, save2])

# Missing transaction in multi-write
async function.*{
  .*\.save\(
  .*\.save\(
```

## Analysis Method

1. **Identify multi-step write operations**: Functions with ≥2 write calls
2. **Classify coordination pattern**:
   - Transaction wrapper: explicit transaction boundary
   - Unit of Work: batch commits
   - Outbox/Saga: eventual consistency with compensation
   - None: independent writes without coordination
3. **Detect bypass**: Multi-writes without any coordination pattern
4. **Map consistency boundaries**: Where are transaction boundaries?

## Coordination Patterns

| Pattern          | Use Case                  | Indicators                       |
| ---------------- | ------------------------- | -------------------------------- |
| **Transaction**  | ACID within single DB     | `BEGIN/COMMIT`, `@Transactional` |
| **Unit of Work** | Batch persistence         | `uow.commit()`, `flush()`        |
| **Outbox**       | Cross-service consistency | `outbox_messages` table          |
| **Saga**         | Distributed transactions  | Compensation logic               |
| **None**         | Independent operations    | Multiple saves, no wrapper       |

## Bypass Detection

Look for patterns like:

```typescript
// Potential issue: no transaction wrapping
async function transferMoney(from: Account, to: Account, amount: number) {
  await accountRepo.save(from.withdraw(amount));  // Could fail here
  await accountRepo.save(to.deposit(amount));     // Leaving inconsistent state
  await auditRepo.save(new AuditLog(...));
}
```

## Reporting Threshold

Report only if:

- Transaction patterns detected AND
- ≥1 bypass (multi-write without coordination) found

## Insight Template

```
INSIGHT:
  id: TXN-[n]
  title: "TRANSACTIONS: [pattern] is dominant, [N] bypasses detected"
  summary: "Multi-step writes use [pattern]. [N] operations lack coordination."
  confidence: [high|medium|low]
  evidence:
    dominant_pattern: "[transaction|uow|outbox|saga|none]"
    pattern_usage:
      - path[:line] — uses [pattern]
    bypasses:
      - path[:line] — [N] writes without coordination
    consistency_risk:
      - description of potential data inconsistency
```

## Standard/Command Suggestions

- **Standard**: "Wrap multi-entity writes in transactions" (if bypasses found)
- **Standard**: "Use Unit of Work for aggregate persistence"
- **Standard**: "Use outbox pattern for cross-service events"
- **Command**: "Add transaction wrapper to use case"
