export function getEnvVar(name: string, defaultValue = ''): string {
  try {
    return import.meta.env[name] ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
