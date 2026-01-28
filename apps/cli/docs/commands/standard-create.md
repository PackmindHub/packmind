# standard:create Command

Create a coding standard from a playbook JSON file.

## Usage

```bash
packmind-cli standards create <file>
```

## Arguments

- `file` (required): Path to the playbook JSON file

## Description

Enables agents to programmatically create Packmind coding standards from validated playbook JSON files. The command:

1. Reads the playbook JSON file from the specified path
2. Validates the structure against the playbook schema
3. Transforms the playbook to the standard format
4. Creates the standard via the Packmind API
5. Returns the created standard ID

## Playbook JSON Format

```json
{
  "name": "React Best Practices",
  "description": "Standards for React component development",
  "scope": "TypeScript React files",
  "rules": [
    {
      "content": "Use functional components with hooks",
      "examples": {
        "positive": "const Component = () => <div>Hello</div>",
        "negative": "class Component extends React.Component {}",
        "language": "TYPESCRIPT_TSX"
      }
    }
  ]
}
```

## Required Fields

- `name` (string): Standard name
- `description` (string): Standard description
- `scope` (string): Where/when the standard applies
- `rules` (array): At least one rule, each with:
  - `content` (string): Rule description (must start with action verb)
  - `examples` (object, optional):
    - `positive` (string): Valid code example
    - `negative` (string): Invalid code example
    - `language` (string): Programming language

## Supported Languages

TYPESCRIPT, TYPESCRIPT_TSX, JAVASCRIPT, JAVASCRIPT_JSX, PYTHON, JAVA, GO, RUST, and 20+ others.

## Examples

```bash
# Create standard from playbook
packmind-cli standards create ./standards/react-best-practices.json

# Expected output on success
# ✅ Standard "React Best Practices" created successfully (ID: std-abc123def)
```

## Error Handling

- Returns error if file is not found
- Returns validation errors if playbook structure is invalid
- Returns API errors if creation fails

For troubleshooting, ensure:

- File path is correct
- JSON is valid
- All required fields present
- Rule content starts with action verb
- Language codes are valid
