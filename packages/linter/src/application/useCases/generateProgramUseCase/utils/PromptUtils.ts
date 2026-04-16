import { RuleExample } from '@packmind/types';

export function getBadExamplesCode(ruleExamples: RuleExample[]) {
  const badExamples = ruleExamples
    .map((r) => r.negative)
    .filter((ex) => ex?.length);

  if (!badExamples.length) {
    return '';
  }

  let badExamplesCode = '## Bad examples for the rule';
  for (const example of badExamples) {
    const prompt = `
\`\`\`
${example}
\`\`\` `;
    badExamplesCode = `${badExamplesCode} \n ${prompt}`;
  }
  return badExamplesCode;
}

export function getGoodExamplesCode(ruleExamples: RuleExample[]) {
  const goodExamples = ruleExamples
    .map((r) => r.positive)
    .filter((ex) => ex?.length);

  if (!goodExamples.length) {
    return '';
  }

  let goodExamplesCode = '## Good examples for the rule';
  for (const example of goodExamples) {
    const prompt = `
\`\`\`
${example}
\`\`\` `;
    goodExamplesCode = `${goodExamplesCode} \n ${prompt}`;
  }
  return goodExamplesCode;
}

export function wrapText(text: string, maxLength = 140): string {
  const words = text.split(' ');
  let currentLine = '';
  const lines: string[] = [];

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = '';
    }
    currentLine += word + ' ';
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

export function indentFileContent(fileContent: string, indent: string): string {
  return fileContent
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

export function limitFileContent(
  fileContent: string,
  maxLines: number,
): string {
  const lines = fileContent.split('\n');
  if (lines.length <= maxLines) return fileContent;

  let foundNonEmptyLine = false;
  const updatedLines = lines
    .slice(0, maxLines)
    .reverse()
    .reduce((acc, line) => {
      if (foundNonEmptyLine) {
        acc.push(line);
      } else if (line.trim().length > 0) {
        foundNonEmptyLine = true;
        acc.push(line);
      }
      return acc;
    }, [] as string[])
    .reverse();

  return [...updatedLines, '...'].join('\n');
}
