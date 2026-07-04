export function stripFrontMatter(rawContent: string): string {
  if (!rawContent.startsWith('---\n')) return rawContent

  const endIndex = rawContent.indexOf('\n---\n', 4)
  if (endIndex === -1) return rawContent

  return rawContent.substring(endIndex + 5)
}
