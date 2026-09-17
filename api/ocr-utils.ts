export function normalizeOcrText(rawText: string): string {
  const cleaned = rawText
    .replace(/\r/g, '\n')
    .replace(/[\t\u00A0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) return '';

  let normalized = cleaned;

  normalized = normalized.replace(/([?])\s+(?=(?:[A-H])\s*[.)])/gi, '$1\n');
  normalized = normalized.replace(/\s+(?=(?:[A-H])\s*[.)])/gi, '\n');
  normalized = normalized.replace(/\s+(?=(?:Q(?:uestion)?\s*\d*\.|\d+\.)\s)/gi, '\n');
  normalized = normalized.replace(/\s*\n\s*/g, '\n').trim();

  return normalized;
}

export function extractJsonPayload(rawAnswer: string): string | null {
  const trimmed = String(rawAnswer ?? '').trim();
  if (!trimmed) return null;

  const direct = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (direct.startsWith('{') && direct.endsWith('}')) {
    return direct;
  }

  const candidates: string[] = [];
  const matches = direct.matchAll(/\{[\s\S]*?\}/g);
  for (const match of matches) {
    const candidate = match[0];
    try {
      JSON.parse(candidate);
      candidates.push(candidate);
    } catch {
      // Ignore malformed candidates and continue looking for the valid payload.
    }
  }

  if (candidates.length > 0) {
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  const start = direct.indexOf('{');
  const end = direct.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    const candidate = direct.slice(start, end + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      return null;
    }
  }

  return null;
}
