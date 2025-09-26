const prompt = `# Contextualized Coding Standards Creation - AI Agent Instructions Analysis Method

This method analyzes AI coding agent instruction files (copilot-instructions.md, CLAUDE.md, AGENTS.md, .cursor/rules/*.mdc) to create standards based on existing AI guidance and coding preferences.

## Method 4: AI Agent Instructions Analysis

### Step 1: AI Agent Instructions Analysis and Topic Identification

Start by analyzing AI coding agent instruction files in the repository to identify coding preferences, patterns, and guidelines that have been established for AI assistance.

**AI Agent Files Search Strategy:**

1. Search for specific AI agent instruction files:
   - \`copilot-instructions.md\` (GitHub Copilot)
   - \`CLAUDE.md\` (Claude Code)
   - \`AGENTS.md\` (Universal AI agent instructions)
   - \`.cursor/rules/*.mdc\` (Cursor-specific rules)

**File Patterns to Analyze:**

\`\`\`bash
# Find AI agent instruction files
find . -name "copilot-instructions.md" -o -name "CLAUDE.md" -o -name "AGENTS.md"

# Find Cursor rules files
find .cursor/rules -name "*.mdc" 2>/dev/null

# Look for other potential AI instruction files
find . -name "*copilot*" -o -name "*claude*" -o -name "*agent*" | grep -E '.(md|mdc)$'
\`\`\`

**Analysis Focus Areas:**

- **Coding preferences**: Style guidelines specified for AI agents
- **Framework patterns**: Specific patterns or approaches preferred
- **Architecture decisions**: Architectural guidance given to AI agents
- **Testing approaches**: Testing patterns and preferences for AI
- **Code quality rules**: Quality standards specified for AI assistance

**Respond directly in the chat session** with up to 5 areas where standards could be created based on existing AI agent instructions.

**Template Response:**
"I've analyzed the AI coding agent instruction files in your repository and identified these areas where coding standards could be formalized based on existing AI guidance and preferences:

1. **[AI Guidance Area]** - [Brief description based on AI instructions, e.g., "Copilot instructions specify React component patterns that could be standardized"]
2. **[AI Guidance Area]** - [Brief description based on AI preferences]
3. **[AI Guidance Area]** - [Brief description based on AI guidelines]
4. **[AI Guidance Area]** - [Brief description based on AI patterns]
5. **[AI Guidance Area]** - [Brief description based on AI standards]

Which area would you like me to focus on for creating formal coding standards? These suggestions are based on coding preferences and guidelines already established for AI coding assistance."

### Step 2: User Selection & Deep Analysis

Once the user selects a topic, acknowledge their choice and proceed with analysis:

"Excellent choice! I'll analyze the AI coding agent instructions for [SELECTED_AREA] to create formal coding standards based on the coding preferences and guidelines already established for AI assistance..."

**AI Instructions Analysis Process:**

1. **Read relevant AI instruction files** identified in the initial analysis
2. **Extract coding preferences** and style guidelines specified for AI agents
3. **Identify patterns** in the guidance given to different AI agents
4. **Look for consistency themes** across different AI instruction files
5. **Find implicit standards** that could be formalized into explicit rules
6. **Reference existing AI guidance** and build upon established preferences

Then perform deep analysis of the selected area based on existing AI agent instructions.

### Step 3: Standard Generation and Presentation

Create a comprehensive standard with exactly 5 rules based on AI agent instructions analysis.

**Response Structure Template:**

\`\`\`markdown
# [Technology/Area] Coding Standards

_Based on analysis of AI coding agent instructions_

## Scope

This standard covers [specific scope based on AI instructions analysis] and formalizes coding preferences already established for AI assistance.

## AI Agent Sources

[Brief summary of key AI instruction files analyzed, e.g., "copilot-instructions.md, CLAUDE.md, AGENTS.md, and Cursor rules"]

## Rules

**Rule 1:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on AI agent preferences]
- **Positive Example**:

\`\`\`[language]
[Code snippet showing correct implementation]
\`\`\`

- **Negative Example**:

\`\`\`[language]
[Code snippet showing incorrect implementation]
\`\`\`

- **Language**: [Programming language]

**Rule 2:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on AI coding guidance]
- **Positive Example**:

\`\`\`[language]
[Code snippet showing correct implementation]
\`\`\`

- **Negative Example**:

\`\`\`[language]
[Code snippet showing incorrect implementation]
\`\`\`

- **Language**: [Programming language]

**Rule 3:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on AI pattern instructions]
- **Positive Example**:

\`\`\`[language]
[Code snippet showing correct implementation]
\`\`\`

- **Negative Example**:

\`\`\`[language]
[Code snippet showing incorrect implementation]
\`\`\`

- **Language**: [Programming language]

**Rule 4:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on AI style preferences]
- **Positive Example**:

\`\`\`[language]
[Code snippet showing correct implementation]
\`\`\`

- **Negative Example**:

\`\`\`[language]
[Code snippet showing incorrect implementation]
\`\`\`

- **Language**: [Programming language]

**Rule 5:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on AI quality guidelines]
- **Positive Example**:

\`\`\`[language]
[Code snippet showing correct implementation]
\`\`\`

- **Negative Example**:

\`\`\`[language]
[Code snippet showing incorrect implementation]
\`\`\`

- **Language**: [Programming language]
\`\`\`

**Important**: Present the complete standard content in the chat session - do not create any files.

### Step 4: Standard Creation Confirmation

After presenting the standard, ask for user confirmation:

"I've created a [SELECTED_AREA] coding standard with [X] rules based on AI coding agent instructions and preferences already established in your repository.

**Key Rules Include:**
- [Brief summary of 2-3 most important rules with AI guidance context]

**AI Agent Sources Used:**
- [Summary of main AI instruction files analyzed]

Would you like me to:
1. **Send this standard to Packmind** (create the official standard)
2. **Refine specific rules** (provide feedback for improvements)
3. **Analyze different AI guidance** areas

What would you prefer?"

## Analysis Strategies

### AI Agent Instructions Analysis Strategies

**AI Agent File Types to Prioritize:**
- **copilot-instructions.md**: GitHub Copilot specific guidance and preferences
- **CLAUDE.md**: Claude Code specific instructions and patterns
- **AGENTS.md**: Universal AI agent instructions and guidelines
- **.cursor/rules/*.mdc**: Cursor-specific coding rules and preferences
- **Other AI files**: Any other AI agent instruction files found

**Analysis Techniques:**
- **Preference Extraction**: Identify coding style preferences specified for AI agents
- **Pattern Recognition**: Look for consistent patterns across different AI instruction files
- **Guidance Analysis**: Extract specific guidance given to AI agents about code quality
- **Consistency Evaluation**: Compare preferences across different AI agent files
- **Implicit Standards**: Find coding standards implied in AI instructions

**AI Instruction Quality Indicators:**
- Specific coding examples and patterns
- Clear style and formatting preferences
- Architecture and design guidance
- Testing and quality requirements
- Framework-specific instructions

## Implementation Guidelines

### AI Agent Instructions Analysis Implementation Steps

1. **Use file search tools** to find all AI agent instruction files in the repository
2. **Read and analyze relevant AI instruction files** focusing on coding preferences and guidelines
3. **Extract coding patterns** and style preferences specified for AI agents
4. **Identify consistency themes** across different AI agent instruction files
5. **Look for implicit standards** mentioned in AI guidance that could be formalized
6. **Reference existing AI preferences** when creating new standards

### Rule Structure Requirements

Each rule must include:
- **content**: Single detailed sentence starting with a verb describing the rule based on AI agent preferences
- **positive**: Code snippet showing correct implementation
- **negative**: Code snippet showing incorrect implementation  
- **language**: Programming language used for the code snippets

## AI Agent Focus Areas

Examples of AI agent instruction areas that frequently contain formalizable standards:

**Coding Style and Preferences:**
- Naming conventions and patterns
- Code formatting and structure
- Comment and documentation styles
- Import organization patterns

**Framework-Specific Guidance:**
- React component patterns and hooks usage
- API design and implementation patterns
- Database interaction patterns
- Testing approaches and patterns

**Architecture and Design:**
- File and folder organization
- Separation of concerns
- Design pattern preferences
- Code organization principles

**Quality and Best Practices:**
- Error handling approaches
- Performance considerations
- Security practices
- Code review guidelines

**Tool Integration:**
- Linter and formatter configurations
- Build tool preferences
- Development workflow patterns
- CI/CD integration practices

## Workflow Completion

After user confirms they want to send to Packmind, create the standard using the MCP tool and inform the user:

"✅ Successfully created the '[STANDARD_NAME]' standard in Packmind!"

**Workflow Completion:**
The standard has been created and is now:
- Available in the team's Packmind standards library
- Based on existing AI coding agent instructions and preferences
- Ready for team adoption and enforcement
- Accessible for future reference and updates`;

export default prompt;
