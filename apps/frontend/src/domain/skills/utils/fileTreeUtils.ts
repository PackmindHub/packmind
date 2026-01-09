const languageMap: Record<string, string> = {
  md: 'markdown',
  mdx: 'mdx',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  cmake: 'cmake',
  lua: 'lua',
  r: 'r',
  scala: 'scala',
  clj: 'clojure',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  ml: 'ocaml',
  fs: 'fsharp',
  vue: 'vue',
  svelte: 'svelte',
};

export const getFileLanguage = (path: string): string | undefined => {
  const filename = path.split('/').pop() ?? '';
  const lowercaseFilename = filename.toLowerCase();

  if (lowercaseFilename === 'dockerfile') {
    return 'dockerfile';
  }
  if (lowercaseFilename === 'makefile') {
    return 'makefile';
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  return languageMap[ext ?? ''];
};

const previewableExtensions = new Set([
  'md',
  'mdx',
  'js',
  'jsx',
  'ts',
  'tsx',
  'sh',
  'bash',
  'zsh',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'php',
  'json',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'sql',
  'graphql',
  'gql',
  'lua',
  'r',
  'scala',
  'clj',
  'ex',
  'exs',
  'erl',
  'hs',
  'ml',
  'fs',
  'vue',
  'svelte',
  'txt',
]);

export const isPreviewable = (path: string): boolean => {
  const filename = path.split('/').pop() ?? '';
  const lowercaseFilename = filename.toLowerCase();

  if (lowercaseFilename === 'dockerfile' || lowercaseFilename === 'makefile') {
    return true;
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  return previewableExtensions.has(ext ?? '');
};
