import Yaml from 'yaml';
import {
  parseCodeOrJsonFromAIAnswer,
  parseCodeOrYamlFromAIAnswer,
} from './ProgramOutputUtils';
import { extractStringOrObjectOfString } from './ProgramExecutionUtils';

describe('parseCodeOrJsonFromAIAnswer', () => {
  it('returns the code from a string with js tags', () => {
    const code = `Hello this is a code
                \`\`\`javascript
                console.log("hello");
                const a = 1;
                \`\`\`  bye`;
    const expectedCode = `console.log("hello");
                const a = 1;`;
    const result = parseCodeOrJsonFromAIAnswer(code);
    expect(result).toEqual(expectedCode);
  });

  it('returns the code from a string with code tags', () => {
    const code = `Hello this is a code
                \`\`\`
                console.log("hello");
                const a = 1;
                \`\`\``;
    const expectedCode = `console.log("hello");
                const a = 1;`;
    const result = parseCodeOrJsonFromAIAnswer(code);
    expect(result).toEqual(expectedCode);
  });

  it('returns the code from a string with no tags', () => {
    const code = `console.log("hello");
                const a = 1;`;
    const expectedCode = `console.log("hello");
                const a = 1;`;
    const result = parseCodeOrJsonFromAIAnswer(code);
    expect(result).toEqual(expectedCode);
  });
});

describe('parseCodeOrJsonFromAIAnswer', () => {
  it('parses code from OpenAI answer that contains json code marks', () => {
    const output =
      '```json\n["^[ \\\\t]*FROM[ \\\\t]+ubuntu(:[^ \\\\t]*)?[ \\\\t]*$", "^[ \\\\t]*FROM[ \\\\t]+ubuntu[ \\\\t]+.*?$"]\n```';
    const expected = `["^[ \\\\t]*FROM[ \\\\t]+ubuntu(:[^ \\\\t]*)?[ \\\\t]*$", "^[ \\\\t]*FROM[ \\\\t]+ubuntu[ \\\\t]+.*?$"]`;
    const result = parseCodeOrJsonFromAIAnswer(output);
    expect(result).toEqual(expected);
  });

  it('parses code from OpenAI answer that contains JavaScript code marks', () => {
    const output = '```javascript\nconst i = 0;```';
    const expected = `const i = 0;`;
    const result = parseCodeOrJsonFromAIAnswer(output);
    expect(result).toEqual(expected);
  });

  it('parses code from OpenAI answer that contains JS code marks', () => {
    const output = '```js\nconst i = 0;```';
    const expected = `const i = 0;`;
    const result = parseCodeOrJsonFromAIAnswer(output);
    expect(result).toEqual(expected);
  });

  it('parses code from OpenAI answer that contains generic code marks', () => {
    const output = '```\nconst i = 0;```';
    const expected = `const i = 0;`;
    const result = parseCodeOrJsonFromAIAnswer(output);
    expect(result).toEqual(expected);
  });

  it('extracts the right program from debugging steps', () => {
    const output =
      "Certainly! Let's add more in the function. I'll add `console.log` statements inside the `traverse` function:\n\n```javascript\nconst Parser = require('tree-sitter')``` so I can analyze and debug accordingly.";
    const expected = "const Parser = require('tree-sitter')";
    const result = parseCodeOrJsonFromAIAnswer(output);
    expect(result).toEqual(expected);
  });

  it('parses the first code extract from Json or Plain text', () => {
    const input = `Here is an implementation of the \`checkSourceCode\` function based on the requirements:
\`\`\`javascript
function checkSourceCode(ast) {}
\`\`\`
Usage example:
\`\`\`javascript
const ast
\`\`\` 
`;
    const code = parseCodeOrJsonFromAIAnswer(input);
    expect(code).toEqual('function checkSourceCode(ast) {}');
  });

  it('parses the first code extract from plain code', () => {
    const input = `
function checkSourceCode(ast) {
    console.log(\`Violations found at lines: \${violations}\`);
}`;
    const code = parseCodeOrJsonFromAIAnswer(input);
    expect(code).toEqual(input);
  });

  it('parses JSON from OpenAI answer without raising errors', () => {
    const output =
      '```json\n{\n  "answer": "semantic",\n  "details": "Detecting exclamation marks within the text content of <Alert> components requires understanding both static and dynamic content. While static text can be analyzed syntactically, many applications use variables, functions, or expressions to generate alert messages. For example, the text might come from a variable like `message`, a function call, or template literals with interpolated values. Syntax analysis would not capture exclamation marks embedded in these dynamic sources. Therefore, semantic analysis is necessary to evaluate the actual text content that will be displayed at runtime, ensuring that exclamation marks are detected regardless of how the message is constructed."\n}\n```';
    const result = parseCodeOrJsonFromAIAnswer(output);

    expect(() => JSON.parse(result)).not.toThrow();

    const jsonObject = JSON.parse(result);
    expect(jsonObject).toEqual(expect.any(Object));
    expect(jsonObject).toHaveProperty('answer');
    expect(jsonObject).toHaveProperty('details');
  });

  it('parses JSON from OpenAI answer without raising errors', () => {
    const output = '```json\n{\n  "answer": "`message` or \'message\'"\n}\n```';
    const result = parseCodeOrJsonFromAIAnswer(output);

    expect(() => JSON.parse(result)).not.toThrow();

    const jsonObject = JSON.parse(result);
    expect(jsonObject).toEqual(expect.any(Object));
    expect(jsonObject).toHaveProperty('answer');
  });
});

describe('parseCodeOrYamlFromAIAnswer', () => {
  it('parses code from OpenAI answer that contains JS code marks', () => {
    const output = `\`\`\`yaml
  guidelines: >
    - Detection Context: \`Look\` for instances where i18n keys are being used within TypeScript or JavaScript files
  \`\`\``;
    const validYaml = `guidelines: >
    - Detection Context: \`Look\` for instances where i18n keys are being used within TypeScript or JavaScript files`;
    const expected = Yaml.parse(validYaml);
    const result = Yaml.parse(parseCodeOrYamlFromAIAnswer(output));
    expect(result).toEqual(expected);
  });

  it('parses whole guidelines from OpenAI answer', () => {
    const output = `\`\`\`yaml
guidelines: |
  - Detection Context: The practice should be detected in any part of the code where internationalization (i18n) keys are used, particularly within functions and components that interact with translation libraries.
  - Violation Detection Method: Look for string concatenations or template literals used to create i18n keys dynamically within translation function calls.
  - Violation Detection Method: Search for the usage of variables in place of static strings that should define i18n keys, especially when these variables are constructed or modified at runtime.
  - Violation Detection Method: Pay attention to translation function calls (like \`t()\`, \`i18n.t()\`, etc.) that do not use hard-coded strings as their parameters for i18n keys.

positive_example: |
  return (
      <div className="title-container-right" data-testid={dataTestId}>
          <PMTypography text={t('DETECTION_CONFIGURATION_TOOLTIP')} />
      </div>
  )

negative_examples:
  - negative_example: |
      const messageKey = sectionName + '_TOOLTIP';
      return t(messageKey);
    reason_for_violation: "This example dynamically constructs the i18n key using a variable 'sectionName' during runtime. Hardcoding the key is preferable to avoid missing translations and ensure maintainability."

  - negative_example: |
      return t(\`ERROR_\${errorCode}\`);
    reason_for_violation: "The i18n key is dynamically created using a template literal with 'errorCode', which may lead to unexpected behavior if the code is incorrect. Static i18n key strings should be used."

location: "A violation should be raised on any use of constructed strings or variables for i18n keys in translation function calls."
\`\`\``;

    const result = Yaml.parse(parseCodeOrYamlFromAIAnswer(output));
    expect(typeof result.guidelines).toEqual('string');
    expect(typeof result.positive_example).toEqual('string');
    expect(Array.isArray(result.negative_examples)).toBe(true);
    expect(result.negative_examples).toHaveLength(2);
  });

  it('produces a string from guidelines that have incorrect indentation and thus 2 objects', () => {
    const output = `
guidelines:
- Detection Context: JavaScript variable declarations in global scope or within functions.
  Violation Detection Method: Search for "var" keywords and replace with either "let" or "const", based on the intended mutability of the variables (mutable should use 'let', immutable/fixed values should use 'const').
- Content Focus: Detecting inappropriate usage of variable declarations indicating potential bugs related to scope and hoisting.
  Audience Consideration: Emphasize understanding block scopes introduced by ES6+ features for better code maintainability, especially relevant with unintentional global variable declaration using 'var'.
`;

    const expected = `
Detection Context: JavaScript variable declarations in global scope or within functions.
Violation Detection Method: Search for "var" keywords and replace with either "let" or "const", based on the intended mutability of the variables (mutable should use 'let', immutable/fixed values should use 'const').
Content Focus: Detecting inappropriate usage of variable declarations indicating potential bugs related to scope and hoisting.
Audience Consideration: Emphasize understanding block scopes introduced by ES6+ features for better code maintainability, especially relevant with unintentional global variable declaration using 'var'.
`;
    const result = Yaml.parse(parseCodeOrYamlFromAIAnswer(output));
    const guidelinesInString = extractStringOrObjectOfString(result.guidelines);
    expect(guidelinesInString.trim()).toEqual(expected.trim());
  });

  it('produces a string from guidelines that have incorrect indentation and thus 2 objects', () => {
    const output = `
guidelines:
    - Detection Context: JavaScript variable declarations in global scope or within functions.
      Violation Detection Method: Search for "var" keywords and replace with either "let" or "const", based on the intended mutability of the variables (mutable should use 'let', immutable/fixed values should use 'const').
    - Content Focus: Detecting inappropriate usage of variable declarations indicating potential bugs related to scope and hoisting.
      Audience Consideration: Emphasize understanding block scopes introduced by ES6+ features for better code maintainability, especially relevant with unintentional global variable declaration using 'var'.
`;

    const expected = `
Detection Context: JavaScript variable declarations in global scope or within functions.
Violation Detection Method: Search for "var" keywords and replace with either "let" or "const", based on the intended mutability of the variables (mutable should use 'let', immutable/fixed values should use 'const').
Content Focus: Detecting inappropriate usage of variable declarations indicating potential bugs related to scope and hoisting.
Audience Consideration: Emphasize understanding block scopes introduced by ES6+ features for better code maintainability, especially relevant with unintentional global variable declaration using 'var'.
`;
    const result = Yaml.parse(parseCodeOrYamlFromAIAnswer(output));
    const guidelinesInString = extractStringOrObjectOfString(result.guidelines);
    expect(guidelinesInString.trim()).toEqual(expected.trim());
  });

  describe('when code examples contain backticks', () => {
    it('correctly parses the guidelines from the output', () => {
      const output = `
Based on the coding practice description, here are the guidelines for detecting violations:
\`\`\`yaml
guidelines:
  - Detection Context: A coroutine is created using the \`withContext\` function.
  - Violation Detection Method: Search for the \`withContext\` function calls that use
      \`Dispatchers.Default\` directly as the parameter. A violation should be
      raised if found.
positive_example: |
  \`\`\`kotlin
            class NewsRepository(
                private val defaultDispatcher: CoroutineDispatcher = Dispatchers.Default
        ) {
                suspend fun loadNews() = withContext(defaultDispatcher) { /* ... */ }
            }
  \`\`\`
negative_examples:
  - negative_example: |
      \`\`\`kotlin
            class NewsRepository {
                suspend fun loadNews() = withContext(Dispatchers.Default) { /* ... */ }
        }
      \`\`\`
    reason_for_violation: The \`Dispatchers.Default\` is hardcoded directly into the
      \`withContext\` function, which makes it difficult to replace for testing
      purposes.
location: A violation should be raised on any \`withContext\` function call that
  uses \`Dispatchers.Default\` directly as the parameter.
\`\`\`
`;
      const parsedYaml = parseCodeOrYamlFromAIAnswer(output);
      const result = Yaml.parse(parsedYaml);
      const guidelinesInString = extractStringOrObjectOfString(
        result.guidelines,
      );
      const positiveExample = result.positive_example;
      const negativeExamples = result.negative_examples;
      expect(typeof guidelinesInString).toEqual('string');
      expect(typeof positiveExample).toEqual('string');
      expect(Array.isArray(negativeExamples)).toBe(true);
      expect(negativeExamples).toHaveLength(1);
    });
  });
});
