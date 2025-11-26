import { RULE_WRITING_GUIDELINES } from './shared/rule-writing-guidelines';

const prompt = `# Contextualized Coding Standards Creation - Web Research Method

This method researches industry best practices and current standards for specific technologies or topics you want to focus on.

## Method 5: Web Research

### Step 1: Codebase Technology Detection

Start by analyzing the current codebase to identify relevant technologies and topics, then present them as research options.

First, analyze the current codebase to identify the most relevant areas where coding standards would be most beneficial. Focus specifically on:

- **Programming languages** and their usage patterns
- **Frameworks and libraries** currently in use
- **Architectural patterns** implemented in the codebase
- Testing approaches
- Build tools and workflow patterns
- Database technologies
- Infrastructure and deployment patterns

### Step 2: Present Research Options

**Respond directly in the chat session** with a numbered list and brief context about their usage in the codebase.

**Template Response:**
"I'll research industry best practices and current standards for technologies in your codebase. Based on my analysis, here are the most relevant topics I can research:

**Technologies Found in Your Codebase:**

1. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
2. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
3. **[Technology/Pattern]** - [Brief description of how it's used in the codebase]
   ...
   [Up to 8-10 most relevant technologies]

**Or specify any other technology/topic you'd like me to research:**

- **Programming Language**: TypeScript, Python, Java, Go, etc.
- **Framework**: React, Angular, Vue, Spring Boot, Django, etc.
- **Architecture Pattern**: Microservices, Clean Architecture, Domain-Driven Design, etc.
- **Development Practice**: API Design, Testing, Code Review, Security, etc.
- **Tool/Technology**: Docker, Kubernetes, GraphQL, REST APIs, etc.

Which technology from your codebase would you like me to research, or what other specific technology/topic should I focus on for creating coding standards?"

### Step 3: Perform Comprehensive Web Research

Once the user specifies their topic (either from the detected technologies or a custom topic), perform comprehensive web research:

"Perfect! I'll research current industry best practices and standards for [SELECTED_TOPIC]. Let me gather information from reliable sources to create comprehensive coding standards..."

**Web Research Strategy:**

1. Search for current industry best practices for the specified topic
2. Look for official documentation and style guides
3. Research common anti-patterns and mistakes to avoid
4. Find recent articles about the technology/topic (2023-2025)
5. Look for established coding standards from reputable sources
6. Search for performance and security considerations

**Web Research Process:**

1. **Official Documentation**: Search for official style guides and documentation
2. **Industry Standards**: Look for established standards from reputable organizations
3. **Best Practices**: Research current best practices and recommendations
4. **Anti-patterns**: Identify common mistakes and patterns to avoid
5. **Recent Trends**: Find up-to-date information about modern approaches
6. **Security & Performance**: Research security and performance considerations
7. **URL Documentation**: Track and document all source URLs used for creating the standards

### Step 4: Standard Generation and Package Selection

**Implementation Process:**

1. **Research current industry best practices** for the selected technology
2. **Generate 5 rules internally** based on authoritative sources
3. **Create a scope/description** that includes source URLs in Markdown format

**Package Selection:**

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

**Standard Creation:**

4. **Call the Packmind MCP tool** (\`packmind_create_standard\`) with:
   - \`name\`: Clear, descriptive name for the standard
   - \`description\`: The scope and context including source URLs in Markdown format
   - \`rules\`: Array of rule objects, each containing:
     - \`content\`: Concise rule (~22 words max) starting with a verb, with inline code if helpful
     - \`examples\`: Array containing one object with \`positive\`, \`negative\`, and \`language\` fields
   - \`packageSlugs\`: Array of package slugs if user selected packages (optional)
5. **Confirm successful creation**: "✅ Successfully created '[STANDARD_NAME]' standard in Packmind based on industry best practices with documented sources."

**Description Format for Web Research:**
The description field should include:
- Scope and context of the standard
- Brief summary of research approach
- Source URLs in Markdown format: \`[Source Name](URL) - Brief description\`
- Note about industry best practices foundation

**Important**: Do not show the rules, examples, or standard content to the user. Only provide confirmation of successful creation.

## Research Strategies

### Web Research Strategies

**Authoritative Sources to Prioritize:**
- Official documentation and style guides
- Established organizations (Google, Microsoft, Mozilla, etc.)
- Language/framework maintainers' recommendations
- Industry-standard repositories and examples
- Peer-reviewed articles and technical publications

**Research Topics to Cover:**
- **Current Best Practices**: Latest recommendations and approaches
- **Common Pitfalls**: Anti-patterns and mistakes to avoid
- **Performance Considerations**: Optimization techniques and considerations
- **Security Practices**: Security-related standards and guidelines
- **Tooling Integration**: How standards work with linters, formatters, etc.
- **Community Consensus**: Widely adopted practices in the community

**Quality Assessment:**
- Verify source credibility and recency
- Cross-reference multiple authoritative sources
- Look for consensus among experts
- Prioritize official and maintained documentation
- Include practical examples and real-world applications
- **Document all URLs**: Keep track of all source URLs during research to include in the final standard

## Implementation Guidelines

### Web Research Implementation Steps

1. **Analyze codebase first** to identify relevant technologies and patterns before research
2. **Use web search extensively** to find authoritative sources and documentation for identified technologies
3. **Prioritize official documentation** and established style guides
4. **Look for recent articles** and best practices (2023-2025)
5. **Research common anti-patterns** and mistakes to avoid
6. **Find performance and security considerations** related to the topic
7. **Gather examples** from reputable sources and established projects
8. **Document all source URLs** used during research
9. **Include source URLs in Markdown format** in the standard description field when calling the Packmind MCP tool
10. **Generate rules internally** and send directly to Packmind without showing to user

${RULE_WRITING_GUIDELINES}

### Rule Structure
Each rule must include:
- **content**: Concise sentence (~22 words max) starting with a verb, with inline code if helpful
- **positive**: Code snippet showing correct implementation based on authoritative sources
- **negative**: Code snippet showing incorrect implementation (anti-patterns)
- **language**: Programming language used for the code snippets

## Technology Focus Areas

Examples of technology areas that benefit from web research-based standards:

**Programming Languages:**
- **JavaScript/TypeScript**: ESLint rules, TypeScript best practices, modern ES features
- **Python**: PEP standards, type hints, async/await patterns
- **Java**: Oracle style guides, Spring Boot best practices, modern Java features
- **C#**: Microsoft coding conventions, .NET best practices, async patterns
- **Go**: Go team style guide, effective Go patterns, concurrency best practices

**Frontend Frameworks:**
- **React**: Official React docs, Meta's best practices, community patterns
- **Angular**: Angular style guide, Google's recommendations, performance patterns
- **Vue**: Vue.js style guide, official best practices, composition API patterns

**Backend Frameworks:**
- **Spring Boot**: Spring team recommendations, microservices patterns, security practices
- **Express.js**: Express best practices, Node.js guidelines, middleware patterns
- **Django**: Django documentation, Python web best practices, security guidelines
- **ASP.NET Core**: Microsoft documentation, .NET best practices, performance guidelines

**Architecture & Patterns:**
- **Microservices**: Industry patterns, distributed systems best practices, observability
- **Domain-Driven Design**: DDD community practices, tactical patterns, strategic design
- **Clean Architecture**: Robert Martin's principles, hexagonal architecture, SOLID principles

**Development Practices:**
- **API Design**: REST best practices, GraphQL guidelines, OpenAPI specifications
- **Testing**: Testing pyramid, TDD practices, test automation patterns
- **Security**: OWASP guidelines, secure coding practices, vulnerability prevention
- **Performance**: Web vitals, optimization techniques, monitoring practices

## Workflow Completion

After successfully creating the standard in Packmind via the MCP tool, inform the user:

"✅ Successfully created the '[STANDARD_NAME]' standard in Packmind!"

**Workflow Completion:**
The standard has been created and is now:
- Available in the team's Packmind standards library
- Based on current industry best practices from authoritative sources
- Includes documented source URLs for reference and verification
- Ready for team adoption and enforcement
- Accessible for future reference and updates`;

export default prompt;
