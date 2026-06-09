export const generate_program_code_heuristics = `
You need to generate a Javascript function called "checkSourceCode" that takes as input a $RULE_LANGUAGE$ source code as a string,
and detect violations of the coding rule described below.

Here is the coding rule description:

"""
$RULE_CONTENT$
"""

# Detection Heuristics
"""
$RULE_HEURISTICS$
"""

$RULE_BAD_EXAMPLES$

$RULE_GOOD_EXAMPLES$

Instructions:
* Use the "Detection Heuristics" that are documentation that provides specific, technical details on how violations of the following coding rule will be detected using static analysis within a single source file.
* Add comments in your code to improve the quality of your logic
* Regarding the violations to report:
  - You need to be very accurate with the line numbers. The first line should be 0, not 1.
  - The reported line should be the start of the pattern location matched.
* $PROGRAM_EXTERNAL_LIBRARIES$
* CRITICAL OUTPUT FORMAT: The output of the function MUST be a simple array of line numbers ONLY. Return EXACTLY this format: [1, 3, 10]. DO NOT return objects with properties like {line: 2, message: "..."} or any other format. ONLY return an array of numbers representing line numbers where violations are found.
* Your answer should only contain the function code, nothing else, even though there are requirements (such as library installation). Example of expected answer:
\`\`\`
function checkSourceCode(code) {
    // Your code here
}
\`\`\`
* Please output only the function code, NOTHING else.
* Do not use any other programming languages than JavaScript.`;
