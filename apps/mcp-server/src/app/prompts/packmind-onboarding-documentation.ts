const prompt = `# Contextualized Coding Standards Creation - Documentation Analysis Method

This method analyzes markdown files in your repository, including ADRs and coding guidelines, to create standards based on existing documented decisions and practices.

## Method 3: Documentation Analysis

### Step 1: Documentation Analysis and Topic Identification

Start by analyzing markdown files in the repository to identify documented decisions, guidelines, and practices that can be formalized into coding standards.

**Documentation Search Strategy:**

1. Search for markdown files across the repository
2. Prioritize files containing:
   - Architectural Decision Records (ADRs)
   - Coding guidelines and conventions
   - Development practices and workflows
   - Technical documentation with standards
   - README files with development guidelines

**File Patterns to Analyze:**

\`\`\`bash
# Find all markdown files
find . -name "*.md" -type f

# Look for specific documentation patterns
find . -name "*ADR*" -o -name "*adr*" -o -name "*decision*"
find . -name "*guideline*" -o -name "*convention*" -o -name "*standard*"
find . -name "*practice*" -o -name "*workflow*" -o -name "*process*"
\`\`\`

**Respond directly in the chat session** with up to 5 areas where standards could be created based on existing documentation.

**Template Response:**
"I've analyzed the markdown documentation in your repository and identified these areas where coding standards could be formalized based on existing documented decisions and practices:

1. **[Documentation Area]** - [Brief description based on documented guidelines, e.g., "ADRs define specific architecture patterns that could be standardized"]
2. **[Documentation Area]** - [Brief description based on documented practices]
3. **[Documentation Area]** - [Brief description based on documented conventions]
4. **[Documentation Area]** - [Brief description based on documented workflows]
5. **[Documentation Area]** - [Brief description based on documented decisions]

Which area would you like me to focus on for creating formal coding standards? These suggestions are based on practices and decisions already documented in your repository."

### Step 2: User Selection & Deep Analysis

Once the user selects a topic, acknowledge their choice and proceed with analysis:

"Excellent choice! I'll analyze the existing documentation for [SELECTED_AREA] to create formal coding standards based on the decisions and practices already documented in your repository..."

**Documentation Analysis Process:**

1. **Read relevant markdown files** identified in the initial analysis
2. **Extract key decisions** and documented practices
3. **Identify implicit standards** mentioned in the documentation
4. **Look for consistency patterns** across different documents
5. **Find gaps** where documented practices could be formalized into rules
6. **Reference existing guidelines** and build upon documented decisions

Then perform deep analysis of the selected area based on existing documentation.

### Step 3: Standard Generation and Presentation

Create a comprehensive standard with exactly 5 rules based on documentation analysis.

**Response Structure Template:**

\`\`\`markdown
# [Technology/Area] Coding Standards

_Based on analysis of existing repository documentation_

## Scope

This standard covers [specific scope based on documentation analysis] and formalizes practices already documented in the repository.

## Documentation Sources

[Brief summary of key documentation analyzed, e.g., "ADRs, coding guidelines, README files, and technical documentation"]

## Rules

**Rule 1:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on documented decisions]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on documented practices]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on documented guidelines]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on documented workflows]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on documented standards]
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

"I've created a [SELECTED_AREA] coding standard with [X] rules based on existing documentation and documented decisions in your repository.

**Key Rules Include:**
- [Brief summary of 2-3 most important rules with documentation context]

**Documentation Sources Used:**
- [Summary of main documentation files analyzed]

Would you like me to:
1. **Send this standard to Packmind** (create the official standard)
2. **Refine specific rules** (provide feedback for improvements)
3. **Analyze different documentation** areas

What would you prefer?"

## Analysis Strategies

### Documentation Analysis Strategies

**Documentation Types to Prioritize:**
- **Architectural Decision Records (ADRs)**: Formal decisions about architecture and design
- **Coding Guidelines**: Existing style guides and conventions
- **README files**: Development setup and contribution guidelines
- **Technical Documentation**: API documentation, architecture diagrams, process docs
- **Workflow Documentation**: Development processes, review guidelines, deployment practices

**Analysis Techniques:**
- **Decision Extraction**: Identify explicit decisions that can become standards
- **Pattern Recognition**: Look for consistent practices mentioned across documents
- **Gap Identification**: Find areas where practice is mentioned but not standardized
- **Consistency Analysis**: Compare guidelines across different documents
- **Implementation Evidence**: Look for references to actual code practices

**Documentation Quality Indicators:**
- Recent updates and maintenance
- Clear decision rationales and context
- Specific implementation guidance
- Examples and patterns mentioned
- Team consensus and approval indicators

## Implementation Guidelines

### Documentation Analysis Implementation Steps

1. **Use file search tools** to find all markdown files in the repository
2. **Read and analyze relevant documentation** focusing on ADRs, guidelines, and practices
3. **Extract key decisions** and documented standards from the files
4. **Identify patterns** and consistency themes across different documents
5. **Look for implicit rules** that could be formalized into explicit standards
6. **Reference existing documentation** when creating new standards

### Rule Structure Requirements

Each rule must include:
- **content**: Single detailed sentence starting with a verb describing the rule based on documented decisions
- **positive**: Code snippet showing correct implementation
- **negative**: Code snippet showing incorrect implementation
- **language**: Programming language used for the code snippets

## Documentation Focus Areas

Examples of documentation areas that frequently contain formalizable standards:

**Architectural Decision Records (ADRs):**
- Technology choices and rationales
- Design pattern decisions
- Integration approaches
- Data modeling decisions

**Coding Guidelines:**
- Style and formatting preferences
- Naming conventions
- Code organization patterns
- Error handling approaches

**Technical Documentation:**
- API design patterns
- Database schema conventions
- Security practices
- Performance guidelines

**Workflow Documentation:**
- Code review processes
- Testing requirements
- Deployment procedures
- Quality gates

**README Files:**
- Project structure conventions
- Development setup patterns
- Contributing guidelines
- Best practices

## Workflow Completion

After user confirms they want to send to Packmind:

### Package Selection

Before creating the standard, determine if it should be added to any packages:

1. Call \`packmind_list_packages\` to see available packages
2. Analyze the standard's scope and topic (e.g., "frontend", "backend", "testing", specific technology, etc.)
3. **If matching packages are found:**
   - Suggest 2-3 relevant packages based on keyword matching between:
     - Standard name/description/scope
     - Package names/descriptions
   - Ask the user: "Would you like to add this standard to any packages? Here are some suggestions based on the standard's topic: [suggestions]. You can also choose from all available packages: [list]"
4. **If packages exist but none match well:**
   - Ask the user: "Would you like to add this standard to any of the existing packages? Available packages: [list]"
5. **If no packages exist at all:**
   - Skip package selection entirely (don't mention anything)

### Standard Creation

Create the standard using the MCP tool (\`packmind_create_standard\`) with:
- \`name\`: Clear, descriptive name for the standard
- \`description\`: The scope and context of the standard (without duplicating the individual rules)
- \`rules\`: Array of rule objects
- \`packageSlugs\`: Array of package slugs if user selected packages (optional)

Then inform the user:

"✅ Successfully created the '[STANDARD_NAME]' standard in Packmind!"

**Workflow Completion:**
The standard has been created and is now:
- Available in the team's Packmind standards library
- Based on existing documented decisions and practices
- Ready for team adoption and enforcement
- Accessible for future reference and updates`;

export default prompt;
