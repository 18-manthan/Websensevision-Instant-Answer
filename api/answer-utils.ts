import { extractJsonPayload } from './ocr-utils';

export type AnswerItem = {
  question: string;
  answer: string;
  optionLabel?: string;
  optionText?: string;
  explanation?: string;
};

export type AnswerPayload = {
  answers: AnswerItem[];
  mode: 'qa' | 'mcq';
};

type RawAnswerItem = {
  question?: unknown;
  answer?: unknown;
  optionLabel?: unknown;
  optionText?: unknown;
  explanation?: unknown;
};

const MAX_ANSWERS = 25;
const MAX_FIELD_LENGTH = 4000;

export const answerPayloadJsonSchema = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['qa', 'mcq'] },
    answers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          optionLabel: { type: ['string', 'null'] },
          optionText: { type: ['string', 'null'] },
          explanation: { type: ['string', 'null'] }
        },
        required: ['question', 'answer', 'optionLabel', 'optionText', 'explanation']
      }
    }
  },
  required: ['mode', 'answers'],
  additionalProperties: false
} as const;

export function parseAnswerPayload(rawAnswer: string): AnswerPayload {
  const json = extractJsonPayload(rawAnswer) ?? rawAnswer.trim();

  try {
    const parsed = JSON.parse(json) as unknown;
    return normalizeAnswerPayload(parsed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown parse error.';
    throw new Error(`The model did not return valid answer JSON. ${detail}`);
  }
}

export function normalizeAnswerPayload(parsed: unknown): AnswerPayload {
  if (!isRecord(parsed)) {
    throw new Error('Answer payload must be a JSON object.');
  }

  const rawAnswers = parsed.answers;
  if (!Array.isArray(rawAnswers)) {
    throw new Error('Answer payload must include an answers array.');
  }

  const answers = rawAnswers
    .slice(0, MAX_ANSWERS)
    .map((item) => normalizeAnswerItem(item as RawAnswerItem))
    .filter((item): item is AnswerItem => Boolean(item));

  if (answers.length === 0) {
    throw new Error('Answer payload did not contain any complete answer items.');
  }

  const hasOptions = answers.some((item) => Boolean(item.optionLabel || item.optionText));
  const requestedMode = parsed.mode === 'mcq' ? 'mcq' : 'qa';

  return {
    mode: hasOptions ? 'mcq' : requestedMode,
    answers
  };
}

function normalizeAnswerItem(item: RawAnswerItem): AnswerItem | null {
  if (!isRecord(item)) return null;

  const question = cleanField(item.question);
  const optionText = cleanOptionalField(item.optionText);
  const answer = cleanField(item.answer) || optionText;

  if (!question || !answer) return null;

  return {
    question,
    answer,
    ...(cleanOptionalField(item.optionLabel) ? { optionLabel: cleanOptionalField(item.optionLabel) } : {}),
    ...(optionText ? { optionText } : {}),
    ...(cleanOptionalField(item.explanation) ? { explanation: cleanOptionalField(item.explanation) } : {})
  };
}

function cleanField(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD_LENGTH);
}

function cleanOptionalField(value: unknown): string | undefined {
  const cleaned = cleanField(value);
  return cleaned || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
