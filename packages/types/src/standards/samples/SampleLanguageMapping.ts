import { ProgrammingLanguage } from '../../languages';

export type ISampleLanguageMapping = {
  languages: ProgrammingLanguage[];
  hardcodedPatterns?: string[];
};

/**
 * Maps language sample IDs to their associated ProgrammingLanguage values.
 */
export const languageSampleMappings: Record<string, ISampleLanguageMapping> = {
  typescript: { languages: [ProgrammingLanguage.TYPESCRIPT] },
  javascript: { languages: [ProgrammingLanguage.JAVASCRIPT] },
  python: { languages: [ProgrammingLanguage.PYTHON] },
  java: { languages: [ProgrammingLanguage.JAVA] },
  csharp: { languages: [ProgrammingLanguage.CSHARP] },
  go: { languages: [ProgrammingLanguage.GO] },
  rust: { languages: [ProgrammingLanguage.RUST] },
  ruby: { languages: [ProgrammingLanguage.RUBY] },
  php: { languages: [ProgrammingLanguage.PHP] },
  swift: { languages: [ProgrammingLanguage.SWIFT] },
  kotlin: { languages: [ProgrammingLanguage.KOTLIN] },
  c: { languages: [ProgrammingLanguage.C] },
  cpp: { languages: [ProgrammingLanguage.CPP] },
  sql: { languages: [ProgrammingLanguage.SQL] },
};

/**
 * Maps framework sample IDs to their associated ProgrammingLanguage values.
 * Some frameworks include hardcoded patterns for file types not in ProgrammingLanguage.
 */
export const frameworkSampleMappings: Record<string, ISampleLanguageMapping> = {
  react: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
  },
  angular: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.HTML,
    ],
  },
  vue: {
    languages: [
      ProgrammingLanguage.VUE,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
  },
  svelte: {
    languages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.JAVASCRIPT],
    hardcodedPatterns: ['**/*.svelte'],
  },
  nextjs: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
  },
  nuxtjs: {
    languages: [
      ProgrammingLanguage.VUE,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
  },
  nestjs: {
    languages: [ProgrammingLanguage.TYPESCRIPT],
  },
  express: {
    languages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.JAVASCRIPT],
  },
  meteor: {
    languages: [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT],
  },
  ionic: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.HTML,
    ],
  },
  'react-native': {
    languages: [
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
  },
  django: {
    languages: [ProgrammingLanguage.PYTHON],
  },
  flask: {
    languages: [ProgrammingLanguage.PYTHON],
  },
  fastapi: {
    languages: [ProgrammingLanguage.PYTHON],
  },
  'spring-boot': {
    languages: [ProgrammingLanguage.JAVA],
  },
  laravel: {
    languages: [ProgrammingLanguage.PHP],
  },
  symfony: {
    languages: [ProgrammingLanguage.PHP],
  },
  zend: {
    languages: [ProgrammingLanguage.PHP],
  },
  rails: {
    languages: [ProgrammingLanguage.RUBY],
  },
  'dotnet-core': {
    languages: [ProgrammingLanguage.CSHARP],
  },
  ansible: {
    languages: [ProgrammingLanguage.YAML],
  },
  terraform: {
    languages: [],
    hardcodedPatterns: ['**/*.tf'],
  },
  flutter: {
    languages: [],
    hardcodedPatterns: ['**/*.dart'],
  },
};
