import * as fs from 'fs';
import * as path from 'path';

import { standardSamples } from '@packmind/types';

interface RuleExample {
  positive: string;
  negative: string;
  language: string;
}

interface Rule {
  content: string;
  examples?: RuleExample;
}

export interface StandardSampleContent {
  name: string;
  summary: string;
  description: string;
  scope: string;
  rules: Rule[];
}

function getGeneratedDir(): string {
  const envPath = process.env['STANDARD_SAMPLES_PATH'];
  if (envPath) {
    return envPath;
  }
  return path.join(__dirname, 'generated');
}

export function getAllSampleIds(): string[] {
  return [
    ...standardSamples.languageSamples.map((s) => s.id),
    ...standardSamples.frameworkSamples.map((s) => s.id),
  ];
}

export async function getStandardSample(
  id: string,
): Promise<StandardSampleContent | null> {
  const generatedDir = getGeneratedDir();
  const filePath = path.join(generatedDir, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  return JSON.parse(content) as StandardSampleContent;
}

export function sampleExists(id: string): boolean {
  const generatedDir = getGeneratedDir();
  const filePath = path.join(generatedDir, `${id}.json`);
  return fs.existsSync(filePath);
}
