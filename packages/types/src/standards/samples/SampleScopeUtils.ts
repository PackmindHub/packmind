import {
  ProgrammingLanguage,
  ProgrammingLanguageDetails,
} from '../../languages';
import {
  ISampleLanguageMapping,
  languageSampleMappings,
  frameworkSampleMappings,
} from './SampleLanguageMapping';

/**
 * Converts an array of ProgrammingLanguage values to a comma-separated glob pattern string.
 * Each language's file extensions are converted to **\/*.ext patterns.
 *
 * @param languages - Array of ProgrammingLanguage values
 * @returns Comma-separated glob pattern string (e.g., "**\/*.ts,**\/*.tsx")
 */
export function languagesToGlobPattern(
  languages: ProgrammingLanguage[],
): string {
  const patterns: string[] = [];

  for (const language of languages) {
    const details = ProgrammingLanguageDetails[language];
    for (const ext of details.fileExtensions) {
      patterns.push(`**/*.${ext}`);
    }
  }

  return patterns.join(',');
}

/**
 * Gets the scope glob pattern for a sample by its ID and type.
 * Combines language-based patterns with any hardcoded patterns.
 *
 * @param sampleId - The sample ID (e.g., "typescript", "react", "svelte")
 * @param type - Whether the sample is a language or framework
 * @returns The glob pattern string, or null if the sample ID is not found
 */
export function getSampleScope(
  sampleId: string,
  type: 'language' | 'framework',
): string | null {
  const mappings =
    type === 'language' ? languageSampleMappings : frameworkSampleMappings;
  const mapping: ISampleLanguageMapping | undefined = mappings[sampleId];

  if (!mapping) {
    return null;
  }

  const patterns: string[] = [];

  // Add hardcoded patterns first (they take priority)
  if (mapping.hardcodedPatterns) {
    patterns.push(...mapping.hardcodedPatterns);
  }

  // Add language-derived patterns
  if (mapping.languages.length > 0) {
    const languagePattern = languagesToGlobPattern(mapping.languages);
    if (languagePattern) {
      patterns.push(languagePattern);
    }
  }

  return patterns.length > 0 ? patterns.join(',') : null;
}

/**
 * Gets the primary language to use for code examples in a sample's generated standards.
 *
 * @param sampleId - The sample ID (e.g., "typescript", "react", "svelte")
 * @param type - Whether the sample is a language or framework
 * @returns The ProgrammingLanguage for examples, or null if not found or not applicable
 */
export function getSampleExampleLanguage(
  sampleId: string,
  type: 'language' | 'framework',
): ProgrammingLanguage | null {
  const mappings =
    type === 'language' ? languageSampleMappings : frameworkSampleMappings;
  const mapping: ISampleLanguageMapping | undefined = mappings[sampleId];

  if (!mapping) {
    return null;
  }

  return mapping.exampleLanguage;
}
