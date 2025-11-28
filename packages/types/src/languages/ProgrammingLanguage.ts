export enum ProgrammingLanguage {
  AVRO = 'AVRO',
  JAVASCRIPT = 'JAVASCRIPT',
  JAVASCRIPT_JSX = 'JAVASCRIPT_JSX',
  TYPESCRIPT = 'TYPESCRIPT',
  TYPESCRIPT_TSX = 'TYPESCRIPT_TSX',
  PYTHON = 'PYTHON',
  PHP = 'PHP',
  JAVA = 'JAVA',
  SCSS = 'SCSS',
  HTML = 'HTML',
  CSHARP = 'CSHARP',
  GENERIC = 'GENERIC', // Fallback for all unsupported programming languages
  GO = 'GO',
  C = 'C',
  CPP = 'CPP',
  SQL = 'SQL',
  KOTLIN = 'KOTLIN',
  VUE = 'VUE',
  CSS = 'CSS',
  YAML = 'YAML',
  JSON = 'JSON',
  XML = 'XML',
  BASH = 'BASH',
  MARKDOWN = 'MARKDOWN',
  RUBY = 'RUBY',
  RUST = 'RUST',
  SAP_ABAP = 'SAP_ABAP',
  SAP_CDS = 'SAP_CDS',
  SAP_HANA_SQL = 'SAP_HANA_SQL',
  SWIFT = 'SWIFT',
  PROPERTIES = 'PROPERTIES',
}

export type ProgrammingLanguageInfo = {
  displayName: string;
  fileExtensions: string[];
};

export const ProgrammingLanguageDetails: Record<
  ProgrammingLanguage,
  ProgrammingLanguageInfo
> = {
  [ProgrammingLanguage.AVRO]: {
    displayName: 'Avro',
    fileExtensions: ['avsc', 'avro', 'avdl'],
  },
  [ProgrammingLanguage.GENERIC]: {
    displayName: 'Generic',
    fileExtensions: [],
  },
  [ProgrammingLanguage.JAVASCRIPT]: {
    displayName: 'JavaScript',
    fileExtensions: ['js'],
  },
  [ProgrammingLanguage.JAVASCRIPT_JSX]: {
    displayName: 'JavaScript (JSX)',
    fileExtensions: ['jsx'],
  },
  [ProgrammingLanguage.TYPESCRIPT]: {
    displayName: 'TypeScript',
    fileExtensions: ['ts'],
  },
  [ProgrammingLanguage.TYPESCRIPT_TSX]: {
    displayName: 'TypeScript (TSX)',
    fileExtensions: ['tsx'],
  },
  [ProgrammingLanguage.PYTHON]: {
    displayName: 'Python',
    fileExtensions: ['py', 'pyx', 'pyw'],
  },
  [ProgrammingLanguage.PHP]: {
    displayName: 'PHP',
    fileExtensions: ['php', 'phtml'],
  },
  [ProgrammingLanguage.JAVA]: {
    displayName: 'Java',
    fileExtensions: ['java'],
  },
  [ProgrammingLanguage.SCSS]: {
    displayName: 'SCSS',
    fileExtensions: ['scss'],
  },
  [ProgrammingLanguage.HTML]: {
    displayName: 'HTML',
    fileExtensions: ['html', 'htm'],
  },
  [ProgrammingLanguage.CSHARP]: {
    displayName: 'C#',
    fileExtensions: ['cs'],
  },
  [ProgrammingLanguage.GO]: {
    displayName: 'Go',
    fileExtensions: ['go'],
  },
  [ProgrammingLanguage.C]: {
    displayName: 'C',
    fileExtensions: ['c', 'h'],
  },
  [ProgrammingLanguage.CPP]: {
    displayName: 'C++',
    fileExtensions: ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx'],
  },
  [ProgrammingLanguage.SQL]: {
    displayName: 'SQL',
    fileExtensions: ['sql'],
  },
  [ProgrammingLanguage.KOTLIN]: {
    displayName: 'Kotlin',
    fileExtensions: ['kt', 'kts'],
  },
  [ProgrammingLanguage.VUE]: {
    displayName: 'Vue',
    fileExtensions: ['vue'],
  },
  [ProgrammingLanguage.CSS]: {
    displayName: 'CSS',
    fileExtensions: ['css'],
  },
  [ProgrammingLanguage.YAML]: {
    displayName: 'YAML',
    fileExtensions: ['yaml', 'yml'],
  },
  [ProgrammingLanguage.JSON]: {
    displayName: 'JSON',
    fileExtensions: ['json'],
  },
  [ProgrammingLanguage.XML]: {
    displayName: 'XML',
    fileExtensions: ['xml'],
  },
  [ProgrammingLanguage.BASH]: {
    displayName: 'Bash',
    fileExtensions: ['sh', 'bash'],
  },
  [ProgrammingLanguage.MARKDOWN]: {
    displayName: 'Markdown',
    fileExtensions: ['md'],
  },
  [ProgrammingLanguage.RUST]: {
    displayName: 'Rust',
    fileExtensions: ['rs'],
  },
  [ProgrammingLanguage.RUBY]: {
    displayName: 'Ruby',
    fileExtensions: ['rb'],
  },
  [ProgrammingLanguage.SAP_ABAP]: {
    displayName: 'SAP ABAP',
    fileExtensions: ['abap', 'ab4'],
  },
  [ProgrammingLanguage.SAP_CDS]: {
    displayName: 'SAP CDS',
    fileExtensions: ['cds'],
  },
  [ProgrammingLanguage.SAP_HANA_SQL]: {
    displayName: 'SAP HANA SQL',
    fileExtensions: [
      'hdbprocedure',
      'hdbfunction',
      'hdbview',
      'hdbcalculationview',
    ],
  },
  [ProgrammingLanguage.SWIFT]: {
    displayName: 'Swift',
    fileExtensions: ['swift'],
  },
  [ProgrammingLanguage.PROPERTIES]: {
    displayName: 'Properties',
    fileExtensions: ['properties'],
  },
};

/**
 * Returns all programming languages sorted by their display name
 */
export const getAllLanguagesSortedByDisplayName = (): Array<{
  language: ProgrammingLanguage;
  info: ProgrammingLanguageInfo;
}> => {
  return Object.entries(ProgrammingLanguageDetails)
    .map(([language, info]) => ({
      language: language as ProgrammingLanguage,
      info,
    }))
    .sort((a, b) => a.info.displayName.localeCompare(b.info.displayName));
};

/**
 * Returns an array of all ProgrammingLanguage enum values
 */
export const getAllProgrammingLanguages = (): ProgrammingLanguage[] => {
  return Object.values(ProgrammingLanguage);
};

/**
 * Converts a string to a ProgrammingLanguage enum value.
 * Matches case-insensitively against language names, display names, and file extensions.
 * @param input - The string to convert (language name or file extension)
 * @returns ProgrammingLanguage enum value
 * @throws Error if no matching language is found
 */
export const stringToProgrammingLanguage = (
  input: string,
): ProgrammingLanguage => {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error('Language input cannot be empty');
  }

  const lowerInput = trimmedInput.toLowerCase();

  // Check direct enum value matches first
  for (const enumValue of Object.values(ProgrammingLanguage)) {
    if (enumValue.toLowerCase() === lowerInput) {
      return enumValue;
    }
  }

  // Check display name matches
  for (const [language, info] of Object.entries(ProgrammingLanguageDetails)) {
    if (info.displayName.toLowerCase() === lowerInput) {
      return language as ProgrammingLanguage;
    }
  }

  // Check file extension matches
  for (const [language, info] of Object.entries(ProgrammingLanguageDetails)) {
    if (info.fileExtensions.some((ext) => ext.toLowerCase() === lowerInput)) {
      return language as ProgrammingLanguage;
    }
  }

  // If no match found, throw an error with helpful message
  const availableLanguages = Object.values(ProgrammingLanguageDetails)
    .map((info) => info.displayName)
    .join(', ');

  throw new Error(
    `Unknown programming language: "${trimmedInput}". Available languages: ${availableLanguages}`,
  );
};
