export const generate_program_for_ast_json = `
## Instructions:
1. You're a senior software developer with strong skills in source code analysis and abstract syntax tree analysis.
2. Your mission is to generate a program that detects violations of a given coding rule. 
3. You need to generate a Javascript function called "checkSourceCode" that takes as input a $RULE_LANGUAGE$ source code, and detect violations of the coding rule described below.
4. The source code is an AST representation in JSON format, generated with tree-sitter, containing the structure of the code. Each object has:
- a "type" property that defines the type of the node
- a "text" property that define the content of the node
- a "children" property that contains an array of child nodes
- a "line" property that defines the line number where the node is located

## Methodology:
* Focus on the "Guidelines Detection" property of the coding rule to understand the steps to follow.
* The guidelines may contain multiple scenarios to detect violations. Your program should consider all these possible scenarios.
* Add comments in your code to improve the quality of your logic
* Check nullity of the json objects you manipulate, to reduce runtime errors.
* Regarding the violations to report:
  - You need to be very accurate with the line numbers. The first line should be 0, not 1.
  - The reported line should be the start of the pattern location matched.
* $PROGRAM_EXTERNAL_LIBRARIES$
* CRITICAL OUTPUT FORMAT: The output of the function MUST be a simple array of line numbers ONLY. Return EXACTLY this format: [1, 3, 10]. DO NOT return objects with properties like {line: 2, message: "..."} or any other format. ONLY return an array of numbers representing line numbers where violations are found.
* Do not use asynchronous/ code or Promise.all. Use only synchronous code.
* The output should be a JavaScript function with the following form:
\`\`\`
function checkSourceCode(ast) {
    // Your code here
}
\`\`\`
* Please output only the function code, NOTHING else.
* Do not use any other programming languages than JavaScript.
* Keep in mind the 'ast' parameter is the JSON representation of the AST of the source code, so you should manipulate this as JSON object with the structure described above. 

## Input:

Here is the coding rule description:
"""
$RULE_CONTENT$
"""

### Detection Guidelines for the rule
"""
$RULE_AST_GUIDELINES$
"""

$RULE_BAD_EXAMPLES$

$RULE_GOOD_EXAMPLES$
`;
