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
 * One `**\/*.ext` pattern per file extension of every language, joined by
 * commas — e.g. `"**\/*.ts,**\/*.tsx"`.
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
 * Combines a sample's hardcoded patterns with the ones derived from its
 * languages. Null when `sampleId` matches no mapping of that type, which is
 * distinct from a mapping that yields no pattern at all.
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

  if (mapping.hardcodedPatterns) {
    patterns.push(...mapping.hardcodedPatterns);
  }

  if (mapping.languages.length > 0) {
    const languagePattern = languagesToGlobPattern(mapping.languages);
    if (languagePattern) {
      patterns.push(languagePattern);
    }
  }

  return patterns.length > 0 ? patterns.join(',') : null;
}

/** The language that code examples in the sample's generated standards use. */
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
