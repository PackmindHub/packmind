export type Sample = {
  id: string;
  displayName: string;
};

const languageSamples: Sample[] = [
  {
    id: 'python',
    displayName: 'Python',
  },
  {
    id: 'c',
    displayName: 'C',
  },
  {
    id: 'java',
    displayName: 'Java',
  },
  {
    id: 'cpp',
    displayName: 'C++',
  },
  {
    id: 'csharp',
    displayName: 'C#',
  },
  {
    id: 'javascript',
    displayName: 'JavaScript',
  },
  {
    id: 'sql',
    displayName: 'SQL',
  },
  {
    id: 'go',
    displayName: 'Go',
  },
  {
    id: 'php',
    displayName: 'PHP',
  },
  {
    id: 'rust',
    displayName: 'Rust',
  },
  {
    id: 'swift',
    displayName: 'Swift',
  },
  {
    id: 'typescript',
    displayName: 'TypeScript',
  },
  {
    id: 'kotlin',
    displayName: 'Kotlin',
  },
  {
    id: 'ruby',
    displayName: 'Ruby',
  },
];

const frameworkSamples: Sample[] = [
  {
    id: 'react',
    displayName: 'React',
  },
  {
    id: 'django',
    displayName: 'Django',
  },
  {
    id: 'angular',
    displayName: 'Angular',
  },
  {
    id: 'ansible',
    displayName: 'Ansible',
  },
  {
    id: 'terraform',
    displayName: 'Terraform',
  },
  {
    id: 'vue',
    displayName: 'Vue.js',
  },
  {
    id: 'spring-boot',
    displayName: 'Spring Boot',
  },
  {
    id: 'laravel',
    displayName: 'Laravel',
  },
  {
    id: 'flask',
    displayName: 'Flask',
  },
  {
    id: 'dotnet-core',
    displayName: '.NET Core',
  },
  {
    id: 'rails',
    displayName: 'Ruby on Rails',
  },
  {
    id: 'svelte',
    displayName: 'Svelte',
  },
  {
    id: 'symfony',
    displayName: 'Symfony',
  },
  {
    id: 'nextjs',
    displayName: 'Next.js',
  },
  {
    id: 'nuxtjs',
    displayName: 'Nuxt.js',
  },
  {
    id: 'nestjs',
    displayName: 'Nest.js',
  },
  {
    id: 'react-native',
    displayName: 'React Native',
  },
  {
    id: 'meteor',
    displayName: 'Meteor',
  },
  {
    id: 'fastapi',
    displayName: 'FastAPI',
  },
  {
    id: 'flutter',
    displayName: 'Flutter',
  },
  {
    id: 'zend',
    displayName: 'Zend Framework',
  },
  {
    id: 'express',
    displayName: 'Express.js',
  },
  {
    id: 'ionic',
    displayName: 'Ionic',
  },
];

/**
 * Maps language IDs to their associated framework display names.
 * Used to exclude framework-specific rules when generating language samples.
 * Only includes languages that have dedicated framework samples.
 */
export const languageToFrameworks: Record<string, string[]> = {
  java: ['Spring Boot'],
  python: ['Django', 'Flask', 'FastAPI'],
  javascript: [
    'React',
    'Angular',
    'Vue.js',
    'Svelte',
    'Next.js',
    'Nuxt.js',
    'Nest.js',
    'Express.js',
    'Meteor',
    'Ionic',
  ],
  typescript: [
    'React',
    'Angular',
    'Vue.js',
    'Svelte',
    'Next.js',
    'Nuxt.js',
    'Nest.js',
    'Express.js',
  ],
  php: ['Laravel', 'Symfony', 'Zend Framework'],
  ruby: ['Ruby on Rails'],
  csharp: ['.NET Core'],
};

export const standardSamples = {
  languageSamples,
  frameworkSamples,
};

export * from './SampleLanguageMapping';
export * from './SampleScopeUtils';
