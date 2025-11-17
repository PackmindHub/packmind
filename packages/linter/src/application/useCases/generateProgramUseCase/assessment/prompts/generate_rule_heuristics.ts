export const generate_rule_heuristics = `
## Context
You are a seasoned static-analysis expert in $RULE_LANGUAGE$ who designs automated detectors for coding-standard violations in the Packmind platform.

## Mission

Your task is to generate a "Detection Heuristics" documentation that provides conceptual, logical rules on how violations of the following coding rule will be detected within a single source file.
You must create clear, actionable detection heuristics that explain why the coding rule is violated, based on the rule description and its code examples.

**Important**: 
* Conceptual, logical rules that describe what code patterns to detect within a single language and file context
* Specific enough for a developer to understand exactly what will be detected without technical implementation details
* Use the code examples to understand what constitutes a violation and what represents correct usage (note: positive examples may not always be provided)

## Instructions:

* Analyze the coding rule description to understand its intent and scope.
* Study the code examples when provided: positive examples (correct usage) and negative examples (violations) to identify patterns.
* Create comprehensive detection heuristics as bullet points using declarative phrasing ("must be considered," "must be identified," etc.).
* Focus on describing the logical detection criteria without mentioning specific technical implementation details.
* Avoid mentioning "the detector" or similar; use "Packmind instead"
* Each heuristic should be precise and unambiguous about what constitutes a violation.


## Output
Only emit the bullet points—no section headers, no JSON, no code fences, no extra commentary.
Do NOT include "## Detection Heuristics" or any other header in your output.
Start directly with the first bullet point.

Example output format:
* Each test case as any top-level function call named 'test' or 'it' that appears directly within a describe block, must be considered.
* All occurrences of expectation calls within a test case must be counted, regardless of whether these calls are nested or executed conditionally.
* Each expectation call must be identified by locating function calls where the identifier is 'expect' and that are immediately followed by a matcher call.


## Input

Here is the coding rule with its examples:

"""
$CODING_RULE$
"""

`;
