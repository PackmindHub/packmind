import { ProgrammingLanguage } from '../../languages';

export type ISampleLanguageMapping = {
  languages: ProgrammingLanguage[];
  hardcodedPatterns?: string[];
  /**
   * The primary language to use for code examples in generated standards.
   * This is typically the most popular/standardized language for the sample.
   * Can be null for samples where no ProgrammingLanguage is appropriate (e.g., Terraform uses HCL).
   */
  exampleLanguage: ProgrammingLanguage | null;
};

/**
 * Maps language sample IDs to their associated ProgrammingLanguage values.
 */
export const languageSampleMappings: Record<string, ISampleLanguageMapping> = {
  typescript: {
    languages: [ProgrammingLanguage.TYPESCRIPT],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  javascript: {
    languages: [ProgrammingLanguage.JAVASCRIPT],
    exampleLanguage: ProgrammingLanguage.JAVASCRIPT,
  },
  python: {
    languages: [ProgrammingLanguage.PYTHON],
    exampleLanguage: ProgrammingLanguage.PYTHON,
  },
  java: {
    languages: [ProgrammingLanguage.JAVA],
    exampleLanguage: ProgrammingLanguage.JAVA,
  },
  csharp: {
    languages: [ProgrammingLanguage.CSHARP],
    exampleLanguage: ProgrammingLanguage.CSHARP,
  },
  go: {
    languages: [ProgrammingLanguage.GO],
    exampleLanguage: ProgrammingLanguage.GO,
  },
  rust: {
    languages: [ProgrammingLanguage.RUST],
    exampleLanguage: ProgrammingLanguage.RUST,
  },
  ruby: {
    languages: [ProgrammingLanguage.RUBY],
    exampleLanguage: ProgrammingLanguage.RUBY,
  },
  php: {
    languages: [ProgrammingLanguage.PHP],
    exampleLanguage: ProgrammingLanguage.PHP,
  },
  swift: {
    languages: [ProgrammingLanguage.SWIFT],
    exampleLanguage: ProgrammingLanguage.SWIFT,
  },
  kotlin: {
    languages: [ProgrammingLanguage.KOTLIN],
    exampleLanguage: ProgrammingLanguage.KOTLIN,
  },
  c: {
    languages: [ProgrammingLanguage.C],
    exampleLanguage: ProgrammingLanguage.C,
  },
  cpp: {
    languages: [ProgrammingLanguage.CPP],
    exampleLanguage: ProgrammingLanguage.CPP,
  },
  sql: {
    languages: [ProgrammingLanguage.SQL],
    exampleLanguage: ProgrammingLanguage.SQL,
  },
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
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT_TSX,
  },
  angular: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.HTML,
    ],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  vue: {
    languages: [
      ProgrammingLanguage.VUE,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
    exampleLanguage: ProgrammingLanguage.VUE,
  },
  svelte: {
    languages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.JAVASCRIPT],
    hardcodedPatterns: ['**/*.svelte'],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  nextjs: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT_TSX,
  },
  nuxtjs: {
    languages: [
      ProgrammingLanguage.VUE,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
    exampleLanguage: ProgrammingLanguage.VUE,
  },
  nestjs: {
    languages: [ProgrammingLanguage.TYPESCRIPT],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  express: {
    languages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.JAVASCRIPT],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  meteor: {
    languages: [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT],
    exampleLanguage: ProgrammingLanguage.JAVASCRIPT,
  },
  ionic: {
    languages: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.HTML,
    ],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT,
  },
  'react-native': {
    languages: [
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
    exampleLanguage: ProgrammingLanguage.TYPESCRIPT_TSX,
  },
  django: {
    languages: [ProgrammingLanguage.PYTHON],
    exampleLanguage: ProgrammingLanguage.PYTHON,
  },
  flask: {
    languages: [ProgrammingLanguage.PYTHON],
    exampleLanguage: ProgrammingLanguage.PYTHON,
  },
  fastapi: {
    languages: [ProgrammingLanguage.PYTHON],
    exampleLanguage: ProgrammingLanguage.PYTHON,
  },
  'spring-boot': {
    languages: [ProgrammingLanguage.JAVA],
    exampleLanguage: ProgrammingLanguage.JAVA,
  },
  laravel: {
    languages: [ProgrammingLanguage.PHP],
    exampleLanguage: ProgrammingLanguage.PHP,
  },
  symfony: {
    languages: [ProgrammingLanguage.PHP],
    exampleLanguage: ProgrammingLanguage.PHP,
  },
  zend: {
    languages: [ProgrammingLanguage.PHP],
    exampleLanguage: ProgrammingLanguage.PHP,
  },
  rails: {
    languages: [ProgrammingLanguage.RUBY],
    exampleLanguage: ProgrammingLanguage.RUBY,
  },
  'dotnet-core': {
    languages: [ProgrammingLanguage.CSHARP],
    exampleLanguage: ProgrammingLanguage.CSHARP,
  },
  ansible: {
    languages: [ProgrammingLanguage.YAML],
    exampleLanguage: ProgrammingLanguage.YAML,
  },
  terraform: {
    languages: [],
    hardcodedPatterns: ['**/*.tf'],
    exampleLanguage: null,
  },
  flutter: {
    languages: [],
    hardcodedPatterns: ['**/*.dart'],
    exampleLanguage: null,
  },
};
