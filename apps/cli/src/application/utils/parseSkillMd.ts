import { parseSkillMdContent } from '@packmind/node-utils';

export type ParsedSkillMd = {
  name: string;
  description: string;
  body: string;
  metadataJson: string;
};

export function parseSkillMd(content: string): ParsedSkillMd | null {
  const parsed = parseSkillMdContent(content);
  if (!parsed) {
    return null;
  }

  const { properties, body } = parsed;

  const name = String(properties.name ?? '');
  const description = String(properties.description ?? '');

  const metadataFields: Record<string, unknown> = Object.fromEntries(
    Object.entries(properties).filter(
      ([key]) => key !== 'name' && key !== 'description',
    ),
  );

  const sorted = Object.keys(metadataFields)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = metadataFields[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

  return {
    name,
    description,
    body,
    metadataJson: JSON.stringify(sorted),
  };
}
