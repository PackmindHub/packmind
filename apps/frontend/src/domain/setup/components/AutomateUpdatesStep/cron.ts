const FIELD_PATTERN = /^(\*|\*\/\d+|\d+(-\d+)?(\/\d+)?(,\d+(-\d+)?(\/\d+)?)*)$/;

export const isValidCron = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) return false;
  return fields.every((field) => FIELD_PATTERN.test(field));
};
