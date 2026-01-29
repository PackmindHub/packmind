/**
 * Script to generate sample coding standards using LLM.
 * Run with: nx run standards:generate-samples
 */

import * as fs from 'fs';
import * as path from 'path';

import { createLLMService, LLMProvider, AIService } from '@packmind/llm';
import { standardSamples, Sample, AI_RESPONSE_FORMAT } from '@packmind/types';

import { generateStandardSamplePrompt } from './prompts/generateStandardSamplePrompt';

interface RuleExample {
  positive: string;
  negative: string;
  language: string;
}

interface Rule {
  content: string;
  examples?: RuleExample;
}

interface StandardSampleContent {
  name: string;
  description: string;
  scope: string;
  rules: Rule[];
}

const GENERATED_DIR = path.join(__dirname, 'generated');
const EXPECTED_RULE_COUNT = 10;
const MAX_ATTEMPTS = 3; // Initial attempt + up to 2 retries

async function ensureGeneratedDir(): Promise<void> {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

function getSampleFilePath(sampleId: string): string {
  return path.join(GENERATED_DIR, `${sampleId}.json`);
}

function sampleExists(sampleId: string): boolean {
  return fs.existsSync(getSampleFilePath(sampleId));
}

function validateStandardContent(content: StandardSampleContent): string[] {
  const errors: string[] = [];

  if (!content.name || typeof content.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }

  if (!content.description || typeof content.description !== 'string') {
    errors.push('Missing or invalid "description" field');
  }

  if (!content.scope || typeof content.scope !== 'string') {
    errors.push('Missing or invalid "scope" field');
  }

  if (!Array.isArray(content.rules)) {
    errors.push('Missing or invalid "rules" array');
    return errors;
  }

  if (content.rules.length !== EXPECTED_RULE_COUNT) {
    errors.push(
      `Expected ${EXPECTED_RULE_COUNT} rules, got ${content.rules.length}`,
    );
  }

  content.rules.forEach((rule, index) => {
    if (!rule.content || typeof rule.content !== 'string') {
      errors.push(`Rule ${index + 1}: Missing or invalid "content" field`);
    }

    if (rule.examples) {
      if (
        !rule.examples.positive ||
        typeof rule.examples.positive !== 'string'
      ) {
        errors.push(
          `Rule ${index + 1}: Missing or invalid "examples.positive" field`,
        );
      }
      if (
        !rule.examples.negative ||
        typeof rule.examples.negative !== 'string'
      ) {
        errors.push(
          `Rule ${index + 1}: Missing or invalid "examples.negative" field`,
        );
      }
      if (
        !rule.examples.language ||
        typeof rule.examples.language !== 'string'
      ) {
        errors.push(
          `Rule ${index + 1}: Missing or invalid "examples.language" field`,
        );
      }
    }
  });

  return errors;
}

async function generateSample(
  llmService: AIService,
  sample: Sample,
  type: 'language' | 'framework',
): Promise<{ success: boolean; error?: string }> {
  const prompt = generateStandardSamplePrompt(sample.displayName, type);

  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `  Attempt ${attempt}/${MAX_ATTEMPTS} for ${sample.displayName}...`,
      );

      const result = await llmService.executePrompt<StandardSampleContent>(
        prompt,
        {
          responseFormat: AI_RESPONSE_FORMAT.JSON_MODE,
          maxTokens: 4096,
          temperature: 0.7,
          retryAttempts: 2, // Built-in retry for API-level issues
        },
      );

      if (!result.success || !result.data) {
        lastError = result.error || 'LLM returned no data';
        console.log(`    Failed: ${lastError}`);
        continue;
      }

      const validationErrors = validateStandardContent(result.data);

      if (validationErrors.length > 0) {
        lastError = validationErrors.join('; ');
        console.log(`    Validation failed: ${lastError}`);
        continue;
      }

      const filePath = getSampleFilePath(sample.id);
      fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2), 'utf-8');
      console.log(`    Success! Saved to ${path.basename(filePath)}`);

      return { success: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.log(`    Error: ${lastError}`);
    }
  }

  return { success: false, error: lastError };
}

async function main(): Promise<void> {
  console.log('Standard Sample Generator');
  console.log('='.repeat(50));

  const llmService = createLLMService({ provider: LLMProvider.PACKMIND });

  console.log('\nChecking LLM configuration...');
  const isConfigured = await llmService.isConfigured();

  if (!isConfigured) {
    console.log('LLM is not configured. Please set up API keys.');
    console.log('Exiting gracefully without generating samples.');
    process.exit(0);
  }

  console.log('LLM is configured.');

  await ensureGeneratedDir();

  const allSamples: { sample: Sample; type: 'language' | 'framework' }[] = [
    ...standardSamples.languageSamples.map((sample) => ({
      sample,
      type: 'language' as const,
    })),
    ...standardSamples.frameworkSamples.map((sample) => ({
      sample,
      type: 'framework' as const,
    })),
  ];

  const results: {
    id: string;
    displayName: string;
    status: 'skipped' | 'success' | 'failed';
    error?: string;
  }[] = [];

  console.log(`\nProcessing ${allSamples.length} samples...\n`);

  for (const { sample, type } of allSamples) {
    console.log(`[${sample.id}] ${sample.displayName} (${type})`);

    if (sampleExists(sample.id)) {
      console.log('  Skipped: File already exists');
      results.push({
        id: sample.id,
        displayName: sample.displayName,
        status: 'skipped',
      });
      continue;
    }

    const result = await generateSample(llmService, sample, type);

    results.push({
      id: sample.id,
      displayName: sample.displayName,
      status: result.success ? 'success' : 'failed',
      error: result.error,
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary');
  console.log('='.repeat(50));

  const skipped = results.filter((r) => r.status === 'skipped');
  const succeeded = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  console.log(`Total: ${results.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Generated: ${succeeded.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed samples:');
    failed.forEach((f) => {
      console.log(`  - ${f.displayName}: ${f.error}`);
    });
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
