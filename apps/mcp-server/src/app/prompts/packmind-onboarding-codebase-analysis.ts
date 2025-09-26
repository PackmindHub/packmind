const prompt = `# Contextualized Coding Standards Creation - Codebase Analysis Method

This method analyzes your current codebase to identify languages, frameworks, or architectural patterns and creates coding standards based on actual usage patterns found in your code.

## Method 1: Codebase Analysis

### Step 1: Codebase Analysis and Topic Identification

Start by analyzing the current codebase to identify the 10 most relevant areas where coding standards would be most beneficial. Focus specifically on:

- **Programming languages** and their usage patterns
- **Frameworks and libraries** currently in use
- **Architectural patterns** implemented in the codebase
- Testing approaches
- Build tools and workflow patterns
- Database technologies
- Infrastructure and deployment patterns

**Respond directly in the chat session** with a numbered list and brief context about their usage in the codebase.

**Template Response:**
"I've analyzed your codebase and identified these key areas where coding standards could provide the most value:

1. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
2. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
3. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
   ...
4. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]

Which area would you like me to focus on for creating coding standards? Or would you prefer a different technology area I might have missed?"

### Step 2: User Selection & Deep Analysis

Once the user selects a topic, acknowledge their choice and proceed with analysis:

"Great choice! I'll analyze your [SELECTED_TOPIC] usage patterns and create comprehensive coding standards focusing on this language, framework, or architectural pattern. Let me examine your codebase..."

Then perform deep analysis of the selected technology in the codebase.

### Step 3: Standard Generation and Creation

**Implementation Process:**

1. **Analyze the selected technology area** in the codebase using appropriate analysis tools
2. **Generate 5 rules internally** based on the codebase analysis patterns
3. **Create a scope/description** for the standard covering the technology area
4. **Call the Packmind MCP tool** (\`packmind_create_standard\`) directly with:
   - \`name\`: Clear, descriptive name for the standard
   - \`description\`: The scope and context of the standard (without duplicating the individual rules)
   - \`rules\`: Array of rule objects, each containing:
     - \`content\`: The rule description (single detailed sentence starting with a verb)
     - \`examples\`: Array containing one object with \`positive\`, \`negative\`, and \`language\` fields
5. **Confirm successful creation**: "✅ Successfully created '[STANDARD_NAME]' standard in Packmind based on your [TECHNOLOGY] codebase patterns."

**Important**: Do not show the rules, examples, or standard content to the user. Only provide confirmation of successful creation.

## Implementation Guidelines

### Technology Detection Priorities

Focus on technologies that appear most frequently in:
1. Package.json dependencies
2. File extensions and imports
3. Architecture documentation
4. Existing standards/configuration files
5. Test files and patterns

### Analysis Implementation Steps

1. **Use codebase analysis tools** to examine actual usage patterns
2. **Search for specific patterns** like imports, class definitions, interface usage, function signatures
3. **Look at existing documentation** for current team conventions
4. **Examine dependency files** (package.json, requirements.txt, pom.xml, etc.) for technology stack understanding
5. **Review test files** to understand testing patterns and preferences
6. **Analyze configuration files** to understand build tools, linters, and workflow preferences
7. **Generate complete standard with all 5 rules** based on codebase analysis
8. **Immediately send to Packmind** using the packmind_create_standard MCP tool
9. **Separate scope/description from rules** - only send the scope section as description, rules go in the rules array
10. **Confirm successful creation** and inform the user the standard is available

## Rule Structure Requirements

Each rule must include:
- **content**: Single detailed sentence starting with a verb describing the rule based on codebase patterns
- **positive**: Code snippet showing correct implementation
- **negative**: Code snippet showing incorrect implementation  
- **language**: Programming language used for the code snippets

## Technology Focus Areas

Examples of technology areas that frequently benefit from coding standards:

**Programming Languages:**
- **JavaScript/TypeScript**: Module patterns, async/await usage, type definitions
- **Python**: Class design, import organization, error handling
- **Java**: Package structure, exception handling, dependency injection
- **C#**: Naming conventions, LINQ usage, async patterns
- **Go**: Error handling, package organization, interface design

**Frontend Frameworks:**
- **React**: Component patterns, hooks usage, state management
- **Angular**: Module organization, service injection, component lifecycle
- **Vue**: Component composition, reactive patterns, template usage

**Backend Frameworks:**
- **Spring Boot**: Configuration patterns, REST controller design, service layers
- **Express.js**: Middleware usage, error handling, route organization
- **Django**: Model design, view patterns, URL routing
- **ASP.NET Core**: Controller patterns, dependency injection, middleware

**Architecture & Patterns:**
- **Microservices**: Service boundaries, communication patterns, data consistency
- **Domain-Driven Design**: Entity design, aggregate patterns, repository usage
- **Clean Architecture**: Layer separation, dependency rules, use case patterns

**Testing:**
- **Unit Testing**: Test structure, mocking patterns, assertion styles
- **Integration Testing**: Test data setup, environment management
- **E2E Testing**: Page object patterns, test organization

**Infrastructure:**
- **Docker**: Dockerfile patterns, multi-stage builds, security practices
- **Kubernetes**: Manifest organization, resource management
- **Terraform**: Module patterns, state management, variable usage

## Workflow Completion

After successfully creating the standard in Packmind via the MCP tool, inform the user:

"✅ Successfully created the '[STANDARD_NAME]' standard in Packmind!"

**Workflow Completion:**
The standard has been created and is now:
- Available in the team's Packmind standards library
- Based on actual codebase patterns from the analyzed code
- Ready for team adoption and enforcement
- Accessible for future reference and updates`;

export default prompt;
