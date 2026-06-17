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
* Create **up to 5 detection heuristics** as concise bullet points using **assertive action verbs** (e.g., "Flag...", "Focus on...", "Exclude...", "Identify...", "Consider...", "Ignore...").
* **Prioritize quality over quantity**: Include only the most essential heuristics (3-5 typically). If a rule is simple, fewer heuristics are better.
* Focus on describing the logical detection criteria without mentioning specific technical implementation details.
* **Avoid mentioning "the detector", "Packmind", or any tool name**—use direct, assertive language instead.
* Each heuristic should be precise, unambiguous, and add unique value—avoid redundancy.
* Keep each heuristic concise (1 sentence maximum).


## Output
Only emit the bullet points—no section headers, no JSON, no code fences, no extra commentary.
Do NOT include "## Detection Heuristics" or any other header in your output.
Start directly with the first bullet point.
**Limit output to a maximum of 5 bullet points, but use fewer if the rule is straightforward.**

Example output format:
* Flag any top-level function call named 'test' or 'it' that appears directly within a describe block as a test case.
* Count all expectation calls within a test case, regardless of nesting or conditional execution.
* Identify expectation calls as function calls where the identifier is 'expect' immediately followed by a matcher call.


## Input

Here is the coding rule with its examples:

"""
$CODING_RULE$
"""

`;
