# Documentation Application

Mintlify-based end-user documentation for Packmind.

## Architecture

- **Framework**: Mintlify for documentation site generation
- **Content Format**: MDX (Markdown with React components)
- **Target Audience**: End users (developers using Packmind)
- **Tone**: Clear, concise, task-oriented
- **Structure**: Organized by user goals and workflows

### Documentation Philosophy

- Focus on what users need to accomplish, not technical implementation
- Avoid unnecessary technical details about internal architecture
- Provide step-by-step guides and examples
- Use screenshots and code samples liberally

## Technologies

- **Mintlify**: Documentation site generator with search and navigation
- **MDX**: Markdown with embedded React components
- **React**: For custom documentation components
- **TypeScript**: Type-safe component development

## Main Commands

- Dev server: `nx dev doc`
- Build: Handled by Mintlify Cloud on deployment
- Lint MDX: Part of root lint process

## Key Patterns

### End-User Focus

- Write for developers using Packmind, not contributors
- Explain features in terms of user benefits and use cases
- Avoid technical jargon and internal architecture details
- Example: "Create a coding standard" not "Instantiate a StandardEntity"

### Task-Oriented Structure

- Organize docs by tasks users want to accomplish
- Start with "Getting Started" and "Quick Start" guides
- Group related tasks into logical sections
- Provide clear navigation and search

### Code Examples

- Include realistic, runnable code examples
- Show both input and expected output
- Explain what each example demonstrates
- Use syntax highlighting for readability

### Visual Aids

- Use screenshots to illustrate UI interactions
- Include diagrams for conceptual explanations
- Keep images up-to-date with latest UI

## Configuration

- **Config File**: `mint.json` in app root
- **Navigation**: Defined in `mint.json`
- **Theming**: Packmind brand colors and styling
- **Search**: Automatically indexed by Mintlify

## Content Organization

- `introduction/` - Getting started, concepts, quick start
- `guides/` - Step-by-step task guides
- `reference/` - API reference, CLI commands
- `integrations/` - Integration with AI agents and tools

## Writing Style

- Use active voice and imperative mood for instructions
- Keep sentences and paragraphs short
- Use bullet points and numbered lists for clarity
- Write in second person ("you") for direct user address

## Related Documentation

- See [Mintlify Documentation](https://mintlify.com/docs) for framework details
- See `.claude/skills/packmind:creating-end-user-documentation-for-packmind/` for documentation creation skill
- See root `CLAUDE.md` for monorepo-wide rules
