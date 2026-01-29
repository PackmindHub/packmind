# Role Taxonomy Drift

Infer what Service/Handler/UseCase/Controller/Repository mean in practice and surface misnamed or mixed-responsibility hotspots.

## Search Patterns

### Common Role Names

```
# Controllers (HTTP/presentation)
*Controller.ts
*Controller.js
*controller.py
*_controller.rb
*Controller.java
*Controller.go

# Handlers (event/command)
*Handler.ts
*Handler.js
*handler.py
*_handler.rb
*Handler.java

# Services (business logic)
*Service.ts
*Service.js
*service.py
*_service.rb
*Service.java

# Use Cases (application layer)
*UseCase.ts
*UseCase.js
*Interactor.ts
*use_case.py
*_use_case.rb

# Repositories (data access)
*Repository.ts
*Repository.js
*Repo.ts
*repository.py
*_repository.rb
*Repository.java

# Managers (ambiguous)
*Manager.ts
*Manager.js
*manager.py

# Helpers/Utils (utility)
*Helper.ts
*Utils.ts
*helper.py
*_helper.rb
```

### Responsibility Indicators

```
# IO operations (should be in repos/adapters)
.save(
.find(
.delete(
.update(
fetch(
axios.
http.
database.
query(
.execute(

# Business logic (should be in services/use cases)
validate
calculate
process
transform
apply
execute business rule

# Presentation concerns (should be in controllers)
@Get(
@Post(
@Put(
@Delete(
res.json(
res.send(
response.
request.
@Query(
@Body(
@Param(

# Event handling (should be in handlers)
@OnEvent(
@Subscribe(
.handle(
.process(
eventEmitter
```

### Mixed Responsibility Indicators

```
# Controller doing business logic
Controller.*{
  .*validate.*
  .*calculate.*
  .*process.*

# Service doing IO directly
Service.*{
  .*\.save\(
  .*\.find\(
  .*fetch\(
  .*database\.

# Repository doing business logic
Repository.*{
  .*validate.*
  .*calculate.*
  .*transform.*

# Handler doing presentation
Handler.*{
  .*res\.json\(
  .*response\.
```

## Analysis Method

1. **Enumerate files by role name**: Group by Controller/Service/UseCase/etc.
2. **Sample and analyze**: Read 3-5 files per role
3. **Classify actual responsibilities**:
   - Presentation: HTTP handling, request/response
   - Business logic: Validation, calculation, rules
   - Data access: Persistence, external calls
   - Orchestration: Coordinating other components
4. **Compare name vs actual**: Does "Service" do service things?
5. **Find mixed responsibilities**: Single file doing multiple concerns

## Expected Responsibilities

| Role           | Expected                       | Red Flags                         |
| -------------- | ------------------------------ | --------------------------------- |
| **Controller** | HTTP handling, request mapping | Business logic, direct DB access  |
| **Service**    | Business logic, orchestration  | HTTP concerns, raw queries        |
| **UseCase**    | Single business operation      | Multiple concerns, infrastructure |
| **Handler**    | Event/command processing       | HTTP responses                    |
| **Repository** | Data access abstraction        | Business rules, validation        |
| **Manager**    | Ambiguous - investigate        | Often a code smell                |

## Drift Categories

| Drift Type             | Example                        | Impact                |
| ---------------------- | ------------------------------ | --------------------- |
| **Bloated controller** | Controller with business logic | Hard to test, coupled |
| **Anemic service**     | Service just delegates         | Unnecessary layer     |
| **Fat repository**     | Repo with business rules       | Logic in wrong layer  |
| **Confused handler**   | Handler doing everything       | Unclear boundaries    |
| **God manager**        | Manager with all concerns      | Unmaintainable        |

## Reporting Threshold

Report only if:

- ≥3 files with same role name AND
- (Inconsistent responsibilities OR mixed concerns detected)

## Insight Template

```
INSIGHT:
  id: ROLE-[n]
  title: "ROLE TAXONOMY: [role] has inconsistent meaning across codebase"
  summary: "[role] files show [N] different responsibility patterns."
  confidence: [high|medium|low]
  evidence:
    role_analysis:
      - role: "Service"
        expected: "business logic"
        actual_patterns:
          - "business logic" — [N] files
          - "data access" — [N] files (drift)
          - "HTTP handling" — [N] files (drift)
    mixed_responsibility_hotspots:
      - path[:line] — [role] doing [unexpected concern]
    naming_inconsistencies:
      - "UserService vs UserManager" — same responsibility
    recommendations:
      - "[file] should be renamed to [better name]"
```

## Standard/Command Suggestions

- **Standard**: "Controllers handle HTTP only, delegate to use cases"
- **Standard**: "Services contain business logic, no IO"
- **Standard**: "Repositories abstract data access only"
- **Command**: "Extract business logic from controller"
