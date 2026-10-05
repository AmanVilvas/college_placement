export function isMissingStudentValue(value: unknown): boolean {
  return value == null || (typeof value === "string" && /^(?:\s*|n\/?a|null|undefined|-)$/i.test(value.trim()));
}
