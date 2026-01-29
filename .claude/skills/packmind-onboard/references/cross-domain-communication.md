# Cross-Domain Communication Patterns

Identify how modules/domains communicate: event-driven, direct coupling, or hybrid.

## Search Patterns

### Event-Driven Patterns

```
# Emitters and dispatchers
emit(
dispatch(
publish(
fire(
trigger(
broadcast(
notify(

# Event infrastructure
EventEmitter
EventBus
EventDispatcher
MessageBroker
MessageQueue
PubSub

# Listeners and handlers
Listener
Handler
Subscriber
Observer
@OnEvent
@Subscribe
@EventHandler
@Listener
on('
addEventListener
```

### Direct Coupling Patterns

```
# Cross-module imports (look for sibling package imports)
from '../packages/
from '@packages/
from '../../modules/
import { } from '@domain/

# Service injection patterns
@Inject(
constructor(private readonly
```

### Message Queue / Broker Patterns

```
# Queue-based
BullMQ
Bull
RabbitMQ
amqplib
kafka
KafkaJS
SQS
sendMessage
receiveMessage

# Mediator patterns
Mediator
MediatR
CommandBus
QueryBus
send(
request(
```

## Classification Criteria

| Pattern             | Indicators                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| **Event-driven**    | ≥60% of cross-module communication uses events; event infrastructure present |
| **Direct coupling** | Modules import each other directly; no event layer                           |
| **Hybrid**          | Mix of event-driven and direct imports; no dominant pattern                  |
| **Message-queue**   | Async communication via external broker (Bull, RabbitMQ, Kafka)              |

## Reporting Threshold

Report only if:

- ≥5 evidence files showing communication patterns, OR
- ≥2 clear boundary violations (direct imports where events expected)

## Insight Template

```
INSIGHT:
  id: COMM-[n]
  title: "COMMUNICATION: [Event-driven|Direct coupling|Hybrid|Message-queue] is dominant"
  summary: "Cross-module communication primarily uses [pattern]. [exceptions if any]"
  confidence: [high|medium|low]
  evidence:
    - path[:line-line]
  exceptions:
    - path[:line-line] — direct import where event expected
```

## Standard/Command Suggestions

- **Standard**: "Use domain events for cross-module communication" (if event-driven is dominant but exceptions exist)
- **Standard**: "Decouple modules via message broker" (if direct coupling dominant but some event usage)
- **Command**: "Create domain event" (if event infrastructure exists but pattern unclear)
