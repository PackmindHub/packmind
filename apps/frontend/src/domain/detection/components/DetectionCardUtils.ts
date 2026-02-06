import {
  ProgrammingLanguage,
  ProgrammingLanguageDetails,
} from '@packmind/types';

export const formatLabelFromEnum = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

  return normalized
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

/**
 * Returns the display name for a programming language from ProgrammingLanguageDetails.
 * Falls back to formatted enum value if language is not found, or '—' if null/undefined.
 */
export const getLanguageDisplayName = (language?: string | null): string => {
  if (!language) {
    return '—';
  }

  const languageDetails =
    ProgrammingLanguageDetails[language as ProgrammingLanguage];

  if (languageDetails) {
    return languageDetails.displayName;
  }

  // Fallback to formatted enum if not found in ProgrammingLanguageDetails
  return formatLabelFromEnum(language);
};
