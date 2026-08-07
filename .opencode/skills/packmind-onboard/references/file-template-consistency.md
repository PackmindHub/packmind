# File Template Consistency

Detect repeatable file templates and propose "Create X" commands for scaffolding.

## Search Patterns

### Common File Roles

```
# Controllers / Handlers
*Controller.ts
*Controller.js
*Handler.ts
*Handler.js
*controller.py
*_controller.rb
*Controller.java

# Services
*Service.ts
*Service.js
*service.py
*_service.rb
*Service.java

# Use Cases
*UseCase.ts
*UseCase.js
*Interactor.ts
*usecase.go
*_use_case.rb

# Repositories
*Repository.ts
*Repository.js
*Repo.ts
*repository.py
*_repository.rb
*Repository.java

# DTOs / Value Objects
*DTO.ts
*Dto.ts
*Request.ts
*Response.ts
*VO.ts
*ValueObject.ts

# Mappers / Adapters
*Mapper.ts
*Adapter.ts
*Converter.ts

# Components (Frontend)
*.component.tsx
*.component.ts
*Component.tsx
*Component.vue

# Hooks (React)
use*.ts
use*.tsx
```

### Structure Markers to Extract

```
# Base classes / interfaces
extends Abstract
extends Base
implements I
implements Interface

# Decorators / annotations
@Controller
@Injectable
@Service
@Repository
@Component
@Module
@Entity
@UseCase

# Constructor injection
constructor(
  private readonly
  private final
  @Inject
  @Autowired

# Standard methods
async execute(
async handle(
async run(
async invoke(
def execute(
def handle(
def call(

# Required exports
export class
export default
export const
module.exports
```

### Directory Conventions

```
# Check for consistent placement
src/controllers/
src/services/
src/useCases/
src/use-cases/
src/application/
src/domain/
src/infra/
src/infrastructure/
src/repositories/
src/handlers/
```

## Analysis Method

1. Identify file categories with ≥5 instances (by naming + directory)
2. Read 3-5 representative files per category
3. Extract shared structure:
   - Base class/interface
   - Required decorators
   - Constructor pattern
   - Standard method signatures
   - Export pattern

## Reporting Threshold

Report only if:
- ≥5 files in category AND
- ≥3 share ≥2 structure markers

## Insight Template

```
INSIGHT:
  id: TMPL-[n]
  title: "FILE PATTERN: [FileType] follows consistent template"
  summary: "[N] [FileType] files share [markers]. Scaffolding can be automated."
  confidence: [high|medium|low]
  evidence:
    - path[:line-line] — shows [marker]
  template_markers:
    - base_class: [name or none]
    - decorators: [list]
    - constructor_pattern: [description]
    - required_methods: [list]
    - export_pattern: [description]
```

## Command Template

When a file pattern is detected, propose a command:

```yaml
name: "create-[file-type]"
summary: "Scaffold a new [FileType] with standard structure"
whenToUse:
  - "Adding a new [file-type] to the codebase"
  - "Need consistent [file-type] structure"
contextValidationCheckpoints:
  - "What is the name of the new [file-type]?"
  - "Which module/domain does it belong to?"
steps:
  - name: "Create file"
    description: "Create [file-type] with standard template"
    codeSnippet: |
      [extracted template]
  - name: "Add to index"
    description: "Export from module index if pattern requires"
  - name: "Create test file"
    description: "Create corresponding test file"
```
