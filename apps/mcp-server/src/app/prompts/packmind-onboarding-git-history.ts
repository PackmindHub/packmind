const prompt = `# Contextualized Coding Standards Creation - Git History Analysis Method

This method analyzes your last 30 git commits to identify areas where standards could address recent development patterns and issues.

## Method 2: Git History Analysis

### Step 1: Git History Analysis and Topic Identification

Start by analyzing the last 30 git commits to understand recent development patterns and identify areas where coding standards could help improve code quality and consistency.

**Git Commands to Execute:**

\`\`\`bash
# Get the last 30 commits with file changes
git log --oneline -30 --name-only

# Get detailed commit information
git log -30 --pretty=format:"%h - %an, %ar : %s" --stat

# Analyze file types and changes
git log -30 --name-only --pretty=format: | sort | uniq -c | sort -nr

# Get recent commits by file extension
git log -30 --name-only --pretty=format: | grep -E '.(js|ts|py|java|go|cs|php|rb|cpp|c|h)$' | sort | uniq -c | sort -nr
\`\`\`

**Analysis Focus Areas:**

- **File types and languages**: What technologies are being actively developed?
- **Change patterns**: Are there recurring issues or inconsistencies?
- **Code areas**: Which modules/components are frequently modified?
- **Commit messages**: Do they reveal patterns of fixes, refactoring, or feature additions?
- **Developer activity**: Are multiple developers working on similar code areas?

**Respond directly in the chat session** with up to 5 targeted standard suggestions based on commit analysis.

**Template Response:**
"I've analyzed your last 30 git commits and identified these areas where coding standards could provide the most value based on recent development activity:

1. **[Standard Area]** - [Brief description based on commit patterns, e.g., "Frequent TypeScript interface changes suggest need for type definition standards"]
2. **[Standard Area]** - [Brief description based on commit patterns]
3. **[Standard Area]** - [Brief description based on commit patterns]
4. **[Standard Area]** - [Brief description based on commit patterns]
5. **[Standard Area]** - [Brief description based on commit patterns]

Which area would you like me to focus on for creating coding standards? These suggestions are based on the most active areas in your recent development work."

### Step 2: User Selection & Deep Analysis

Once the user selects a topic, acknowledge their choice and proceed with analysis:

"Excellent choice! I'll analyze your recent commits related to [SELECTED_AREA] to create targeted coding standards. Let me examine the specific patterns and issues I found in your git history..."

**Additional Git Commands for Deep Analysis:**

\`\`\`bash
# Analyze specific file types related to the selected area
git log -30 --name-only --pretty=format: | grep -E '.(relevant_extensions)$' | xargs git log -30 --follow --

# Look for specific patterns in commit messages
git log -30 --grep="[relevant_keywords]" --oneline

# Analyze recent changes to specific directories
git log -30 --name-only -- [relevant_path]/* | head -50

# Get diff statistics for pattern analysis
git log -30 --stat -- [relevant_files]
\`\`\`

Then perform deep analysis of the selected area based on git history patterns.

### Step 3: Standard Generation and Presentation

Create a comprehensive standard with exactly 5 rules based on git commit analysis.

**Response Structure Template:**

\`\`\`markdown
# [Technology/Area] Coding Standards

_Based on analysis of recent git commit patterns_

## Scope

This standard covers [specific scope based on commit analysis] and addresses patterns observed in the last 30 commits.

## Context from Git Analysis

[Brief summary of what was found in the commits that led to these rules]

## Rules

**Rule 1:**

- **Content**: [Single detailed sentence starting with a verb describing the rule based on git patterns]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on git patterns]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on git patterns]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on git patterns]
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

- **Content**: [Single detailed sentence starting with a verb describing the rule based on git patterns]
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

"I've created a [SELECTED_AREA] coding standard with [X] rules based on patterns found in your recent git commits.

**Key Rules Include:**
- [Brief summary of 2-3 most important rules with git context]

**Git Insights Used:**
- [Summary of main patterns that informed the rules]

Would you like me to:
1. **Send this standard to Packmind** (create the official standard)
2. **Refine specific rules** (provide feedback for improvements)
3. **Start over** with a different standard area

What would you prefer?"

## Analysis Strategies

### Git Analysis Strategies

**Commit Message Patterns:**
- Look for recurring keywords: "fix", "refactor", "cleanup", "typo", "inconsistent"
- Identify areas with frequent bug fixes
- Notice patterns in feature development

**File Change Patterns:**
- Frequently modified files may need standards
- New file creation patterns
- Deletion/renaming patterns that suggest inconsistency

**Developer Activity Patterns:**
- Multiple developers touching same files
- Conflicting changes or merge conflicts
- Code review feedback patterns

**Code Quality Indicators:**
- Commits with "fix lint" or "formatting" suggest style standards needed
- Rollback commits suggest need for better practices
- Performance fix commits suggest optimization standards

**Technology Usage Patterns:**
- New dependencies being added
- Framework updates or migrations
- Testing pattern changes
- Configuration file modifications

## Implementation Guidelines

### Git History Analysis Implementation Steps

1. **Execute git commands** to analyze commit patterns and file changes
2. **Examine commit messages** for recurring keywords and patterns
3. **Identify frequently modified files** that may need standards
4. **Look for merge conflicts** or rollback patterns indicating issues
5. **Analyze developer activity** on shared code areas
6. **Review file change statistics** to understand development hotspots

### Rule Structure Requirements

Each rule must include:
- **content**: Single detailed sentence starting with a verb describing the rule based on git patterns
- **positive**: Code snippet showing correct implementation
- **negative**: Code snippet showing incorrect implementation  
- **language**: Programming language used for the code snippets

## Workflow Completion

After user confirms they want to send to Packmind, create the standard using the MCP tool and inform the user:

"✅ Successfully created the '[STANDARD_NAME]' standard in Packmind!"

**Workflow Completion:**
The standard has been created and is now:
- Available in the team's Packmind standards library
- Based on actual git commit patterns from recent development work
- Ready for team adoption and enforcement
- Accessible for future reference and updates`;

export default prompt;
