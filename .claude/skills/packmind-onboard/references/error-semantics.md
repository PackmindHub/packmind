# Error Semantics Convergence

Map how errors propagate and flag mixed semantics in the same call chain.

## Search Patterns

### Exception-Based Patterns

```
# Throwing
throw new Error
throw new
throw Error(
raise Exception
raise ValueError
raise RuntimeError
panic(
panic!

# Catching
try {
} catch
except
rescue
catch (
.catch(
try:
except:

# Custom exception classes
extends Error
extends Exception
class.*Error
class.*Exception
```

### Result/Either Patterns

```
# Rust-style Result
Result<
Ok(
Err(
.unwrap()
.expect(
.map_err(
?;

# Functional Either
Either<
Left(
Right(
fold(
bimap(
mapLeft(

# neverthrow (TypeScript)
ok(
err(
Result.ok
Result.err
.mapErr(
.andThen(
fromPromise(
fromThrowable(

# fp-ts
E.left
E.right
E.fold
E.map
E.mapLeft
pipe(

# True Myth
Result.ok
Result.err
Maybe.just
Maybe.nothing

# Go-style
error
errors.New
errors.Wrap
if err != nil
return nil, err
```

### Sentinel/Null Return Patterns

```
# Null/undefined returns
return null
return undefined
return None
return nil

# Optional patterns
Option<
Optional<
Maybe<
Some(
None
.orElse(
.getOrElse(

# Sentinel values
return -1
return false
return ""
return []
return {}
```

### Mixed Semantics Indicators

```
# Throwing inside Result-returning function
async function.*Result.*throw
fn.*Result.*panic

# Catching and converting
.catch(.*=> err(
try.*return ok(
except.*return Left(

# Null checks after Result
result?.value
result && result.value
if (result)
```

## Analysis Method

1. **Sample functions**: Take 20-30 functions across different modules
2. **Classify error handling style** per function:
   - Exception-based: throws/catches
   - Result-based: returns Result/Either
   - Sentinel-based: returns null/special value
   - Mixed: multiple styles in same function
3. **Trace call chains**: For key flows, check if style is consistent
4. **Flag transitions**: Where does Result become throw? Vice versa?

## Error Style Distribution

| Style             | Indicators                  | Consistency Concern               |
| ----------------- | --------------------------- | --------------------------------- |
| **Exceptions**    | try/catch throughout        | Need consistent catch boundaries  |
| **Result/Either** | All functions return Result | Need consistent unwrapping        |
| **Sentinel**      | null checks everywhere      | Need null safety patterns         |
| **Mixed**         | Some throw, some Result     | Conversion points are error-prone |

## Call Chain Analysis

```
Example problematic chain:
  controller (throws)
    -> service (returns Result)
      -> repository (throws)
        -> database (throws)

Issues:
  - service must catch repository throws
  - controller must handle both Result and throws
```

## Reporting Threshold

Report only if:

- ≥2 error styles detected AND
- Mixed styles found in same module or call chain

## Insight Template

```
INSIGHT:
  id: ERR-[n]
  title: "ERROR SEMANTICS: [N] styles coexist ([list])"
  summary: "Error handling uses [styles]. Mixed semantics in [areas]."
  confidence: [high|medium|low]
  evidence:
    styles_detected:
      exceptions: [N] files
      result_either: [N] files
      sentinel_null: [N] files
    mixed_semantics:
      - path[:line] — throws inside Result-returning function
      - path[:line] — catches and converts to Result
    call_chain_issues:
      - chain: "A -> B -> C"
        problem: "B returns Result but C throws"
```

## Standard/Command Suggestions

- **Standard**: "Use Result type for recoverable errors" (if mixed found)
- **Standard**: "Exceptions for truly exceptional cases only" (if overused)
- **Standard**: "Convert exceptions at boundaries" (if mixed in chains)
