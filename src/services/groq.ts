const DEFAULT_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
];

export function getGroqModelCandidates(): string[] {
  const fromSingle = (process.env.GROQ_MODEL || '').trim();
  const fromList = (process.env.GROQ_MODELS || '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  const ordered = [fromSingle, ...fromList, ...DEFAULT_GROQ_MODELS].filter(Boolean);
  return [...new Set(ordered)];
}
