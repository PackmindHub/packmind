# Concurrency Style Consistency

Identify the dominant async/concurrency model and exceptions where styles are bridged ad-hoc.

## Search Patterns

### Async/Await Patterns

```
# JavaScript/TypeScript
async function
async (
await
Promise<
.then(
.catch(
Promise.all(
Promise.race(
Promise.allSettled(

# Python
async def
await
asyncio.
aiohttp
trio
anyio

# Rust
async fn
.await
tokio::
async-std

# C#
async Task
await
Task<
Task.Run
async void  # (anti-pattern)

# Go (goroutines)
go func
go
chan
<-
select {
```

### Callback Patterns

```
# Node.js callbacks
(err, result) =>
callback(
cb(
done(
next(

# Event-based
.on(
.once(
.emit(
EventEmitter
addEventListener

# Continuation passing
continuation
cont(
```

### Sync-in-Async Anti-Patterns

```
# Blocking calls in async context
.wait()
.Result  # C# blocking
.get()   # Java Future blocking
sync_to_async
asyncio.run(  # Inside async
run_sync(
block_on(

# Explicit sync wrappers
toSync(
makeSync(
synchronous(
blocking(
```

### Async-to-Sync Bridges

```
# Python
asyncio.get_event_loop().run_until_complete
nest_asyncio
async_to_sync

# JavaScript
deasync
synchronize
```

### Thread/Process Patterns

```
# Threading
Thread(
threading.
pthread
std::thread
thread::spawn

# Process
Process(
multiprocessing
subprocess
fork(
spawn(

# Thread pools
ThreadPoolExecutor
Executors.newFixedThreadPool
rayon::
tokio::spawn
```

### Reactive Patterns

```
# RxJS
Observable
Subject
pipe(
subscribe(
map(
filter(
switchMap(
mergeMap(

# Reactive Streams
Flux
Mono
Publisher
Subscriber
```

## Analysis Method

1. **Identify dominant async model**: async/await, callbacks, reactive, threads
2. **Scan for bridging patterns**: sync-in-async, async-to-sync wrappers
3. **Check consistency per module**: Does each module use one style?
4. **Flag anti-patterns**: Blocking calls in async context

## Concurrency Models

| Model | Language Examples | Indicators |
|-------|-------------------|------------|
| **async/await** | JS/TS, Python, Rust, C# | `async`, `await`, `Promise` |
| **Callbacks** | Node.js (legacy), C | `(err, result)`, `callback` |
| **Reactive** | RxJS, Reactor | `Observable`, `subscribe` |
| **Threads** | Java, Go, Rust | `Thread`, `goroutine`, `spawn` |
| **Actors** | Akka, Erlang | `Actor`, `!`, `receive` |

## Bridge Anti-Patterns

| Anti-Pattern | Risk | Detection |
|--------------|------|-----------|
| **Sync in async** | Blocks event loop | `.wait()` in async fn |
| **Async to sync** | Deadlock risk | `run_until_complete` nested |
| **Mixed models** | Confusing flow | Callbacks + async in same file |
| **Fire-and-forget** | Lost errors | Unhandled promise |

## Reporting Threshold

Report only if:
- ≥2 concurrency styles detected OR
- ≥1 bridging anti-pattern found

## Insight Template

```
INSIGHT:
  id: ASYNC-[n]
  title: "CONCURRENCY: [model] is dominant, [N] style bridges detected"
  summary: "Codebase primarily uses [model]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    dominant_model: "[async-await|callbacks|reactive|threads]"
    distribution:
      async_await: [N] files
      callbacks: [N] files
      reactive: [N] files
      threads: [N] files
    bridges:
      - path[:line] — sync call in async context
      - path[:line] — async-to-sync wrapper
    anti_patterns:
      - path[:line] — [description]
```

## Standard/Command Suggestions

- **Standard**: "Use async/await consistently, avoid callbacks" (if mixed)
- **Standard**: "Never block in async context" (if sync-in-async found)
- **Standard**: "Handle all promises (no fire-and-forget)"
