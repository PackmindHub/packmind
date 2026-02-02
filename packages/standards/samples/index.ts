/**
 * Standard sample access utilities.
 * Provides programmatic access to generated standard samples.
 */

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

/**
 * Get all available sample IDs from the StandardSamples definition.
 * @returns Array of sample ID strings
 */
export function getAllSampleIds(): string[] {
  return [
    ...standardSamples.languageSamples.map((s) => s.id),
    ...standardSamples.frameworkSamples.map((s) => s.id),
  ];
}

/**
 * Get a standard sample by its ID.
 * @param id The sample ID (e.g., 'java', 'spring')
 * @returns The parsed standard sample content, or null if not found
 */
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

/**
 * Check if a sample exists in the generated directory.
 * @param id The sample ID to check
 * @returns true if the sample file exists, false otherwise
 */
export function sampleExists(id: string): boolean {
  const generatedDir = getGeneratedDir();
  const filePath = path.join(generatedDir, `${id}.json`);
  return fs.existsSync(filePath);
}
