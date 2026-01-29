export type Sample = {
  id: string;
  displayName: string;
};

const languageSamples: Sample[] = [
  {
    id: 'java',
    displayName: 'Java',
  },
];

const frameworkSamples: Sample[] = [
  {
    id: 'spring',
    displayName: 'Spring',
  },
];

export const standardSamples = {
  languageSamples,
  frameworkSamples,
};
