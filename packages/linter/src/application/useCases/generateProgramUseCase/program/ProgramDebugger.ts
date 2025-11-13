import { AnalysisResult, LineViolation } from '../generation/Types';
import { SourceCodeRepresentation } from './AbstractRuleDetectionProgram';
import { PackmindLogger } from '@packmind/logger';
import {
  PromptConversation,
  PromptConversationRole,
} from '@packmind/node-utils';

const logger = new PackmindLogger('ProgramDebugger');

function getPromptSuggestAddDebugInformation() {
  return `
Your program may not working as expected, so please add some console.log to understand what is happening.
I'll then execute the program and send you the output so that you can analyze it.
Only output the updated JavaScript program with the function 'checkSourceCode', do not mention anything else, for instance some explanations or how to execute this code.
If your code contains multiple functions, include all of them.`;
}

export function getPromptInformDebuggingHasStarted() {
  return `
Thank you for this program.
It seems that the program is not working as expected.
I suggest you to debug the program and add some console.log to understand what is happening.
Can you please update the program and add all the console.log you need?
I'll then execute the program and send you the output so that you can analyze it.
Only output the updated JavaScript program, do not mention anything else, for instance some explanations or how to execute this code.
If your code contains multiple functions, include all of them.
`;
}

export async function addPromptWithDebuggingInformation(
  fileContent: SourceCodeRepresentation,
  output: string,
  result: AnalysisResult,
) {
  let promptDiag = `
Thank you for this program.
It seems that the program is not totally working as expected.
I now provide you details and debugging information about the execution of your program.

Here's the input passed to the checkSourceCode function:
"""
${fileContent.content}
"""

The program has generated the following output:
"""
${output}
"""

Here are the observations about the program execution with the input source code:`;

  if (result.falsePositives.length) {
    logger.debug('add prompt with false positive');
    promptDiag = `${promptDiag}
* The provided program has generated false positives on the following lines: ${result.falsePositives}.
These are false positives, so they should not be detected by the program.`;
  }
  if (result.falseNegatives.length) {
    logger.debug('add prompt with false negative');
    promptDiag = `${promptDiag}
* The provided program has missed false negatives on the following lines:
${displayLinesOfViolations(result.falseNegatives)}.
 These are false negatives, so they should be detected by the program.`;
  }
  if (result.truePositives.length) {
    logger.debug('add prompt with true positives');
    promptDiag = `${promptDiag}
* Good job, the program has detected the following lines as violations:
${displayLinesOfViolations(result.truePositives)}.
These are true positives, so they are correctly detected by the program.`;
  }

  if (
    !result.falsePositives.length &&
    !result.falseNegatives.length &&
    !result.truePositives.length
  ) {
    throw new Error('But what the fuck are we doing here ?!');
  }

  promptDiag = `${promptDiag}

Can you please analyze the output and the results, and update the program accordingly?
You can add more console.log to understand the behavior of the program.
You can remove console.log if you do not need them anymore.
I will execute this program and will send you the output back for debugging.

Only output the updated JavaScript program, do not mention anything else, for instance some explanations or how to execute this code.
Remember the main JavaScript function should be named 'checkSourceCode'.
If your code contains multiple functions, include all of them.
Do not include examples on how to use this program, I will do it on my own.`;

  return promptDiag;
}

export function displayLinesOfViolations(violations: LineViolation[]) {
  return violations
    .map((v) => {
      if (v.start < v.end) {
        return ` - A line between line ${v.start} and ${v.end}`;
      }
      return ` - Line ${v.start}`;
    })
    .join('\n');
}

export async function buildConversationWithDebuggingInformation(
  fileContent: SourceCodeRepresentation,
  context: string,
  program: string,
  output: string,
  result: AnalysisResult,
): Promise<PromptConversation[]> {
  const promptDiag: PromptConversation[] = [];
  // Original instruction
  promptDiag.push({
    role: PromptConversationRole.USER,
    message: `${context} \n ${getPromptSuggestAddDebugInformation()}`,
  });
  promptDiag.push({
    role: PromptConversationRole.ASSISTANT,
    message: program,
  });
  promptDiag.push({
    role: PromptConversationRole.USER,
    message: await addPromptWithDebuggingInformation(
      fileContent,
      output,
      result,
    ),
  });

  return promptDiag;
}
