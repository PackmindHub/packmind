export const convert_rule_guidelines_to_ast = `
## Context:
You're a senior software developer with strong skills in source code analysis and abstract syntax tree analysis.
Your mission is to generate detection guidelines for a coding rule, so that an AI Agent will later use them to generate a program that detects violations of this coding rule. 
Your output will be critical to help AI Agent in succeeding in its mission.

## Instructions:
* You'll be given as input a coding rule with its name, a description, some detection guidelines specific to the $RULE_LANGUAGE$ programming language, and a list of code examples.
* The list of code examples contain both 'good' and 'bad' examples. Good examples refer to code that are compliant with the coding rule. Bad examples refer to code that are not compliant with the coding rule.
* All source code are written using their representation in JSON mode, with the following structure:
    - a "type" property that defines the type of the node
    - a "text" property that define the content of the node
    - a "line" property that defines the line number where the node is located
    - a "children" property that contains an array of child nodes, containing these 4 properties, with no limit in terms of depth.
* You need to generate detection guidelines for a program that will take as input JSON objects that are Abstract Syntax Tree representation of the original source.
* Keep in mind that the original coding rule description and guidelines have been written by human and target actual source code. You need to keep the conversion to AST and JSON mode in mind.

## Guidelines requirements:
- Audience Consideration: Write as if addressing a beginner developer; include details that might be obvious to experienced developers.
- Maximum Number of steps:
  - Do not exceed 10 steps to detect the violation.
- Conciseness and Clarity:
  - Be concise and go straight to the point.
  - Use short sentences without unnecessary words.
- Structured Format:
  - Use bullet points to create a detailed action plan for detecting violations.
  - Organize the guidelines in a clear and logical order.
- Focus on Syntax Elements:
  - Indicate what JSON objects and properties must be checked.
  - Focus only and what is strictly necessary to detect the violation. For instance, if the violation is about a method call, whatever the context, you can skip the surrounding class or method.
  - Try to find the simplest way to detect the violation.
  - Keep in mind that the depth level maybe different from one example to another.
  - Do not include in your guidelines the root element, often called "program" or "compilation_unit".
  - Do not include in your guidelines the "type: 'ERROR'" which is caused by temporary parsing issues, but do not reflect the code representation. Just ignore this.
- Detection Only:
  - Do not include recommendations on how to fix the violation; focus solely on how to detect it.
- Multiple Detection Methods:
  - If there are multiple ways to detect violations, create separate guidelines for each scenario.


## Output Format:

The output must be in YAML format with the following structure:

\`\`\`
guidelines:
 - guideline: | 
     <Your guidelines to detect violations in the first identified scenario>
 - guideline: | 
     <If you have identified multiple scenarios, add as many guidelines as you want.></If>
\`\`\`

Output ONLY the YAML object, nothing else.

## Input

Here is the coding rule description:
"""
$RULE_CONTENT$
"""

This practice concerns source code written in $RULE_LANGUAGE$.

Here are the detection heuristics:
"""
$RULE_HEURISTICS$
"""

$RULE_BAD_EXAMPLES$

$RULE_GOOD_EXAMPLES$
`;
