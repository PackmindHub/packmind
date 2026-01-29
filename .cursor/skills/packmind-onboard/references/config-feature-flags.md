# Configuration & Feature Flag Access Pattern

Detect whether config/flags are centralized or scattered; list read points and naming issues.

## Search Patterns

### Configuration Access

```
# Environment variables
process.env.
process.env[
os.environ
os.getenv
ENV[
System.getenv
std::env::var
env::var

# Config objects
config.
Config.
configuration.
settings.
appConfig.
appSettings.

# Config files
config.json
config.yaml
config.yml
.env
.env.local
.env.production
appsettings.json
application.yml
application.properties

# Config libraries
dotenv
convict
config (npm)
ConfigService
@ConfigModule
@Value("${
@ConfigurationProperties
```

### Feature Flag Patterns

```
# Flag checks
isEnabled(
isFeatureEnabled
featureFlag(
feature.
flags.
FF_
FEATURE_
enabledFeatures
toggles.

# Flag libraries
LaunchDarkly
launchdarkly
Unleash
unleash
Split
split-io
Flagsmith
ConfigCat
GrowthBook

# Inline conditionals
if (config.feature
if (flags.
if (process.env.ENABLE_
if (featureEnabled
```

### Centralized Config Patterns

```
# Config module/service
ConfigService
ConfigProvider
ConfigModule
config/index
settings/index

# Validated config
z.object(  # Zod
Joi.object(
class-validator
@IsString()
@IsNumber()

# Type-safe config
interface Config
type Config =
ConfigSchema
```

### Scattered Config Indicators

```
# Direct env access in business logic
// In service/use-case files:
process.env.
os.environ

# Hardcoded defaults with env
process.env.X || 'default'
getenv('X') or 'default'

# Magic strings
'production'
'development'
'staging'
```

## Analysis Method

1. **Find all config read points**: Grep for env access, config objects
2. **Map locations**: Are reads in dedicated config module or scattered?
3. **Check centralization**:
   - Centralized: Config service/module, validated schema
   - Scattered: Direct env reads in business logic
4. **Analyze naming**: Consistent prefixes? Type-safe access?
5. **Feature flags**: Separate system or mixed with config?

## Access Pattern Categories

| Pattern | Indicators | Quality |
|---------|------------|---------|
| **Centralized + validated** | ConfigService, Zod/Joi schema | Best |
| **Centralized** | Config module, single source | Good |
| **Mixed** | Some centralized, some direct | Needs work |
| **Scattered** | Direct env access everywhere | Poor |

## Naming Consistency Checks

```
# Check for consistent prefixes
DATABASE_  vs  DB_
REDIS_     vs  CACHE_
API_       vs  SERVICE_
FEATURE_   vs  FF_  vs  ENABLE_

# Check for type indicators
_URL
_PORT
_HOST
_TIMEOUT
_ENABLED
_COUNT
```

## Reporting Threshold

Report only if:
- Config reads found AND
- (Scattered pattern detected OR naming inconsistencies found)

## Insight Template

```
INSIGHT:
  id: CONFIG-[n]
  title: "CONFIG: [centralized|scattered] access with [N] read points"
  summary: "Configuration is [pattern]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    pattern: "[centralized|mixed|scattered]"
    config_module: "path or none"
    read_points:
      centralized: [N]
      scattered:
        - path[:line] — direct env access in [layer]
    naming_issues:
      - "DATABASE_ vs DB_" — inconsistent prefix
      - "Missing type suffix for [var]"
    feature_flags:
      system: "[library or custom or none]"
      flag_count: [N]
      scattered_checks:
        - path[:line] — inline flag check
```

## Standard/Command Suggestions

- **Standard**: "Access configuration through ConfigService only" (if scattered)
- **Standard**: "Validate configuration at startup" (if no schema)
- **Standard**: "Use consistent config naming: PREFIX_TYPE_NAME"
- **Command**: "Add config value" (through proper channel)
